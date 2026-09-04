import type {
	createDataSource,
	ExecutionMode,
	StartExecutionResult,
	TriggerOutputs,
	WorkflowGraph,
} from '@n8n/engine';
import {
	AllowAllAdmittance,
	createEngineRuntime,
	mintIdentityToken,
	SharedSecretIdentityVerifier,
	WorkflowExecution,
	WorkflowStepExecution,
} from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
/* The Set and Merge source files predate strict mode, and Merge also uses path
aliases this package does not resolve, so both come from dist. */
import { Merge } from 'n8n-nodes-base/dist/nodes/Merge/Merge.node';
import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { NoOp } from 'n8n-nodes-base/nodes/NoOp/NoOp.node';
import { SplitOut } from 'n8n-nodes-base/nodes/Transform/SplitOut/SplitOut.node';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { vi } from 'vitest';

import { createEngineStepDataLoader } from '../engine-step-data-loader';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import { testAdditionalDataFactory, v1Workflow } from './fixtures';

const registry = new Map<string, INodeType | IVersionedNodeType>([
	['n8n-nodes-base.set', new SetNode()],
	['n8n-nodes-base.merge', new Merge()],
	['n8n-nodes-base.noOp', new NoOp()],
	['n8n-nodes-base.splitOut', new SplitOut()],
]);

export const realNodeTypes: INodeTypes = {
	getByName: (type) => {
		const found = registry.get(type);
		if (!found) throw new UnrecognizedNodeTypeError('e2e', type);
		return found;
	},
	getByNameAndVersion: (type, version) => {
		const found = registry.get(type);
		if (!found) throw new UnrecognizedNodeTypeError('e2e', type);
		return NodeHelpers.getVersionedNodeType(found, version);
	},
	getKnownTypes: (): IDataObject => ({}),
};

export const converter = new V1WorkflowConverter();

const authSecret = 'a'.repeat(32);
const caller = { cpId: 'cp-1', tenantId: 'tenant-1' };

export type Assignment = { name: string; value: string | number; type: string };

/** A Set node definition applying `assignments`, wired by the caller. */
export function setNode(id: string, name: string, assignments: Assignment[]) {
	return {
		id,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		parameters: {
			mode: 'manual',
			assignments: {
				assignments: assignments.map((assignment, i) => ({ id: String(i), ...assignment })),
			},
			options: {},
		},
	};
}

export const TRIGGER = {
	id: 'trigger',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
};

export const mainTo = (target: string) => ({
	main: [[{ node: target, type: 'main' as const, index: 0 }]],
});

/**
 * Trigger into a Split In Batches loop, one item per pass, a No Op body that
 * hands each pass straight back, and a Set node after the loop.
 *
 * ┌─────────┐    ┌──────┐ o1    ┌──────┐
 * │ trigger ├───►│      ├──────►│ Body │
 * └─────────┘    │ Loop │       └───┬──┘
 *                │      ◄──(back)───┘
 *                └───┬──┘ o0
 *                    ▼
 *                ┌───────┐
 *                │ After │
 *                └───────┘
 */
export function loopWorkflow(
	batchSize: number,
	body: {
		id: string;
		name: string;
		type: string;
		typeVersion?: number;
		parameters?: IDataObject;
	} = {
		id: 'body',
		name: 'Body',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
	},
) {
	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				{
					id: 'loop',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					parameters: { batchSize },
				},
				body,
				setNode('after', 'After', [{ name: 'ran', value: 'yes', type: 'string' }]),
			],
			{
				'When clicking Execute': mainTo('Loop'),
				Loop: {
					main: [
						[{ node: 'After', type: 'main' as const, index: 0 }],
						[{ node: 'Body', type: 'main' as const, index: 0 }],
					],
				},
				Body: mainTo('Loop'),
			},
		),
	);
}

/**
 * A loop whose body branches in two and reconverges on a Merge before returning.
 *
 *                         ┌──────┐ o0 i0 ┌──────┐
 *                    ┌───►│ Left ├──────►│      │
 * ┌──────┐ o1 ┌──────┤    └──────┘       │ Join │
 * │ Loop ├───►│ Fork │                   │      │
 * └───▲──┘    └──────┤    ┌──────┐ o0 i1 │      │
 *     │              └───►│ Right├──────►│      │
 *     │                   └──────┘       └───┬──┘
 *     └────────────────(back)────────────────┘
 */
export function branchyLoopWorkflow(batchSize: number) {
	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				{
					id: 'loop',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					parameters: { batchSize },
				},
				{ id: 'fork', name: 'Fork', type: 'n8n-nodes-base.noOp', typeVersion: 1 },
				setNode('left', 'Left', [{ name: 'side', value: 'left', type: 'string' }]),
				setNode('right', 'Right', [{ name: 'side', value: 'right', type: 'string' }]),
				{
					id: 'join',
					name: 'Join',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					parameters: { mode: 'append', numberInputs: 2 },
				},
				setNode('after', 'After', [{ name: 'ran', value: 'yes', type: 'string' }]),
			],
			{
				'When clicking Execute': mainTo('Loop'),
				Loop: {
					main: [
						[{ node: 'After', type: 'main' as const, index: 0 }],
						[{ node: 'Fork', type: 'main' as const, index: 0 }],
					],
				},
				Fork: {
					main: [
						[
							{ node: 'Left', type: 'main' as const, index: 0 },
							{ node: 'Right', type: 'main' as const, index: 0 },
						],
					],
				},
				Left: { main: [[{ node: 'Join', type: 'main' as const, index: 0 }]] },
				Right: { main: [[{ node: 'Join', type: 'main' as const, index: 1 }]] },
				Join: mainTo('Loop'),
			},
		),
	);
}

/**
 * Two loops in a row, the first one's done slot feeding the second.
 *
 * ┌─────────┐    ┌─────┐ o1    ┌─────────┐
 * │ trigger ├───►│     ├──────►│ BodyOne │
 * └─────────┘    │ One │       └────┬────┘
 *                │     ◄───(back)───┘
 *                └──┬──┘ o0
 *                   ▼
 *                ┌─────┐ o1    ┌─────────┐
 *                │     ├──────►│ BodyTwo │
 *                │ Two │       └────┬────┘
 *                │     ◄───(back)───┘
 *                └──┬──┘ o0
 *                   ▼
 *               ┌───────┐
 *               │ After │
 *               └───────┘
 */
export function chainedLoopsWorkflow(batchSize: number) {
	const loopNode = (id: string, name: string) => ({
		id,
		name,
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 3,
		parameters: { batchSize },
	});

	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				loopNode('one', 'One'),
				{ id: 'body-one', name: 'BodyOne', type: 'n8n-nodes-base.noOp', typeVersion: 1 },
				loopNode('two', 'Two'),
				{ id: 'body-two', name: 'BodyTwo', type: 'n8n-nodes-base.noOp', typeVersion: 1 },
				setNode('after', 'After', [{ name: 'ran', value: 'yes', type: 'string' }]),
			],
			{
				'When clicking Execute': mainTo('One'),
				One: {
					main: [
						[{ node: 'Two', type: 'main' as const, index: 0 }],
						[{ node: 'BodyOne', type: 'main' as const, index: 0 }],
					],
				},
				BodyOne: mainTo('One'),
				Two: {
					main: [
						[{ node: 'After', type: 'main' as const, index: 0 }],
						[{ node: 'BodyTwo', type: 'main' as const, index: 0 }],
					],
				},
				BodyTwo: mainTo('Two'),
			},
		),
	);
}

/**
 * A loop whose loop slot returns straight to itself, with no body between.
 *
 * ┌─────────┐    ┌──────┐ o0    ┌───────┐
 * │ trigger ├───►│ Loop ├──────►│ After │
 * └─────────┘    └──▲─┬─┘       └───────┘
 *                   └─┘ o1, straight back
 */
export function selfLoopWorkflow(batchSize: number) {
	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				{
					id: 'loop',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					parameters: { batchSize },
				},
				setNode('after', 'After', [{ name: 'ran', value: 'yes', type: 'string' }]),
			],
			{
				'When clicking Execute': mainTo('Loop'),
				Loop: {
					main: [
						[{ node: 'After', type: 'main' as const, index: 0 }],
						[{ node: 'Loop', type: 'main' as const, index: 0 }],
					],
				},
			},
		),
	);
}

export function setWorkflow(assignments: Assignment[]) {
	return converter.convert(
		v1Workflow([TRIGGER, setNode('set-node', 'Edit Fields', assignments)], {
			'When clicking Execute': mainTo('Edit Fields'),
		}),
	);
}

type EngineDataSource = ReturnType<typeof createDataSource>;

export function makeRunWorkflow(getDataSource: () => EngineDataSource) {
	return async function runWorkflow(
		graph: WorkflowGraph,
		triggerOutputs: TriggerOutputs | null,
		mode?: ExecutionMode,
	) {
		const dataSource = getDataSource();

		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));

		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(authSecret),
			// also how the test reaches the stores the runtime owns
			externalDependencies: ({ executionStore, stepStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
					const recorded = await finishExecution(id, status);
					done();
					return recorded;
				});

				return {
					v1StepExecutor: new V1StepExecutor({
						nodeTypes: realNodeTypes,
						additionalDataFactory: testAdditionalDataFactory,
						loadStepData: createEngineStepDataLoader(executionStore, stepStore),
					}),
				};
			},
		});
		runtime.start();

		// over HTTP, because that is the engine's only boundary
		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set('Authorization', `Bearer ${mintIdentityToken(authSecret, caller)}`)
			// The caller mints the execution id; the engine never mints one.
			.send({
				workflowId: 'wf-m1',
				graph,
				// Opaque to the engine, and no acceptance case reads it back.
				workflow: {},
				triggerOutputs,
				mode,
				executionId: uuidv7(),
			})
			.expect(201);
		const { executionId } = response.body as StartExecutionResult;

		try {
			await Promise.race([
				finished,
				new Promise((_, reject) => {
					setTimeout(() => {
						reject(
							new Error(
								`execution ${executionId} never recorded an outcome: the engine stalled without calling finishExecution`,
							),
						);
					}, 10_000).unref();
				}),
			]);
		} finally {
			await runtime.stop();
		}

		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		return {
			execution,
			steps,
			byNode: (nodeId: string) =>
				steps.find((step: WorkflowStepExecution) => step.nodeId === nodeId),
		};
	};
}
