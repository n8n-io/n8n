import type {
	createDataSource,
	StartExecutionResult,
	TriggerOutputs,
	WorkflowGraph,
} from '@n8n/engine';
import {
	AllowAllAdmittance,
	createEngineRuntime,
	WorkflowExecution,
	WorkflowStepExecution,
} from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
/* The Set node's source files predate strict mode and would fail this
package's strict typecheck if pulled into the program. */
import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { NoOp } from 'n8n-nodes-base/nodes/NoOp/NoOp.node';
import { SplitOut } from 'n8n-nodes-base/nodes/Transform/SplitOut/SplitOut.node';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import request from 'supertest';
import { vi } from 'vitest';

import { createEngineStepDataLoader } from '../engine-step-data-loader';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import { testAdditionalDataFactory, v1Workflow } from './fixtures';

const registry = new Map<string, INodeType | IVersionedNodeType>([
	['n8n-nodes-base.set', new SetNode()],
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

export const TRIGGER = {
	id: 'trigger',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
};

export const mainTo = (target: string) => ({
	main: [[{ node: target, type: 'main' as const, index: 0 }]],
});

export function setWorkflow(assignments: Assignment[]) {
	return converter.convert(
		v1Workflow([TRIGGER, setNode('set-node', 'Edit Fields', assignments)], {
			'When clicking Execute': mainTo('Edit Fields'),
		}),
	);
}

type EngineDataSource = ReturnType<typeof createDataSource>;

export function makeRunWorkflow(getDataSource: () => EngineDataSource) {
	return async function runWorkflow(graph: WorkflowGraph, triggerOutputs: TriggerOutputs | null) {
		const dataSource = getDataSource();

		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));

		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
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
			.send({ workflowId: 'wf-m1', graph, triggerOutputs })
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
