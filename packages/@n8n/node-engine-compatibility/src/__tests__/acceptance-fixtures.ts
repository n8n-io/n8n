import type { ExecutionMode, TriggerOutputs, WorkflowGraph } from '@n8n/engine';
import { WorkflowExecution, WorkflowStepExecution } from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import { ExecuteWorkflow } from 'n8n-nodes-base/dist/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/dist/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
/* The Set and Merge source files predate strict mode, and Merge also uses path
aliases this package does not resolve, so both come from dist. */
import { Merge } from 'n8n-nodes-base/dist/nodes/Merge/Merge.node';
import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { NoOp } from 'n8n-nodes-base/nodes/NoOp/NoOp.node';
import { SplitOut } from 'n8n-nodes-base/nodes/Transform/SplitOut/SplitOut.node';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { SubWorkflowResolver } from '../types';
import { EngineTestRuntime } from '../testing';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import { testAdditionalDataFactory, v1Workflow } from './fixtures';

const registry = new Map<string, INodeType | IVersionedNodeType>([
	['n8n-nodes-base.set', new SetNode()],
	['n8n-nodes-base.executeWorkflow', new ExecuteWorkflow()],
	['n8n-nodes-base.executeWorkflowTrigger', new ExecuteWorkflowTrigger()],
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

export function splitOutNode(id: string, name: string, field: string) {
	return {
		id,
		name,
		type: 'n8n-nodes-base.splitOut',
		typeVersion: 1,
		parameters: { fieldToSplitOut: field, options: {} },
	};
}

export function loopNode(id: string, name: string, batchSize: number) {
	return {
		id,
		name,
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 3,
		parameters: { batchSize },
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
export function loopV1Workflow(
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
	return v1Workflow(
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
export function branchyLoopV1Workflow(batchSize: number) {
	return v1Workflow(
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
export function chainedLoopsV1Workflow(batchSize: number) {
	const loopNode = (id: string, name: string) => ({
		id,
		name,
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 3,
		parameters: { batchSize },
	});

	return v1Workflow(
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
export function selfLoopV1Workflow(batchSize: number) {
	return v1Workflow(
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
	);
}

export function setV1Workflow(assignments: Assignment[]) {
	return v1Workflow([TRIGGER, setNode('set-node', 'Edit Fields', assignments)], {
		'When clicking Execute': mainTo('Edit Fields'),
	});
}

export const loopWorkflow = (...args: Parameters<typeof loopV1Workflow>) =>
	converter.convert(loopV1Workflow(...args));

export const branchyLoopWorkflow = (...args: Parameters<typeof branchyLoopV1Workflow>) =>
	converter.convert(branchyLoopV1Workflow(...args));

export const chainedLoopsWorkflow = (...args: Parameters<typeof chainedLoopsV1Workflow>) =>
	converter.convert(chainedLoopsV1Workflow(...args));

export const selfLoopWorkflow = (...args: Parameters<typeof selfLoopV1Workflow>) =>
	converter.convert(selfLoopV1Workflow(...args));

export const setWorkflow = (...args: Parameters<typeof setV1Workflow>) =>
	converter.convert(setV1Workflow(...args));

/** Engine v2 with the real nodes. Start it with a migrated Postgres database. */
export const acceptanceRuntime = () =>
	new EngineTestRuntime({
		nodeTypes: realNodeTypes,
		additionalDataFactory: testAdditionalDataFactory,
	});

export function makeRunWorkflow(getRuntime: () => EngineTestRuntime) {
	return async function runWorkflow(
		graph: WorkflowGraph,
		triggerOutputs: TriggerOutputs | null,
		mode?: ExecutionMode,
		{
			resolveSubWorkflow,
		}: {
			/** Resolves the sub-workflows the run calls, as the control plane would. */
			resolveSubWorkflow?: SubWorkflowResolver;
		} = {},
	) {
		const engine = getRuntime();
		const start = await engine.startExecution({
			workflowId: 'wf-m1',
			graph,
			triggerOutputs,
			mode,
			// the v1 mode of an unattended run is `trigger`
			callerContext: { hostMode: mode === 'manual' ? 'manual' : 'trigger' },
			resolveSubWorkflow,
		});
		if (!start.started) {
			throw new Error(
				`The engine refused the execution: ${start.status} ${JSON.stringify(start.body)}`,
			);
		}
		const { executionId } = start;
		await engine.waitForFinish(executionId);

		const { dataSource } = engine;
		// A fire-and-forget sub-execution can finish after its parent.
		const subExecutions = await dataSource
			.getRepository(WorkflowExecution)
			.find({ where: { parentExecutionId: executionId } });
		for (const { id } of subExecutions) await engine.waitForFinish(id);

		// the run as the control plane reads it, steps included
		const view = await engine.getExecution(executionId);
		const steps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId } });
		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		return {
			execution,
			steps,
			view,
			byNode: (nodeId: string) =>
				steps.find((step: WorkflowStepExecution) => step.nodeId === nodeId),
		};
	};
}
