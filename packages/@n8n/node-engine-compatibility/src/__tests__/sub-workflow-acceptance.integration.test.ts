import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { converter, mainTo, makeRunWorkflow, setNode, TRIGGER } from './acceptance-fixtures';
import { v1Workflow } from './fixtures';
import { toStepOutputs } from '../io';
import type { SubWorkflowResolveRequest, SubWorkflowResolver } from '../types';

const SUB_WORKFLOW_TRIGGER = 'When Executed by Another Workflow';

/** The sub-workflow: its trigger passes the items through, and a Set node marks them. */
function subWorkflowFixture(
	assignment = { name: 'fromSubWorkflow', value: 'yes', type: 'string' },
) {
	return v1Workflow(
		[
			{
				id: 'sub-trigger',
				name: SUB_WORKFLOW_TRIGGER,
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1,
				parameters: {},
			},
			setNode('sub-workflow-set', 'Mark', [assignment]),
		],
		{ [SUB_WORKFLOW_TRIGGER]: mainTo('Mark') },
	);
}

/** The parent: an Execute Sub-workflow node calls `sub-execution`, then a Set node runs on what came back. */
function parentWorkflow(options: { waitForSubWorkflow?: boolean } = {}) {
	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				{
					id: 'exec',
					name: 'Execute Sub-workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					parameters: { source: 'database', workflowId: 'sub-workflow', mode: 'once', options },
				},
				setNode('after', 'After', [{ name: 'after', value: 'ran', type: 'string' }]),
			],
			{
				'When clicking Execute': mainTo('Execute Sub-workflow'),
				'Execute Sub-workflow': mainTo('After'),
			},
		),
	);
}

/**
 * What the control plane answers: the sub-workflow's graph, and its trigger outputs
 * from the items the parent handed over, passed through as the trigger does.
 */
function resolverFor(subWorkflow = subWorkflowFixture()): SubWorkflowResolver {
	return vi.fn(async (request: SubWorkflowResolveRequest) => {
		return await Promise.resolve({
			workflowId: request.workflowId,
			graph: converter.convert(subWorkflow, SUB_WORKFLOW_TRIGGER),
			workflow: { id: request.workflowId, name: 'Sub-workflow' },
			triggerOutputs: toStepOutputs([request.items]),
		});
	});
}

describe('sub-workflow acceptance (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: ReturnType<typeof createDataSource>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	const runWorkflow = makeRunWorkflow(() => dataSource);
	const subExecutionOf = async (parentId: string) =>
		await dataSource.getRepository(WorkflowExecution).findOneOrFail({
			where: { parentExecutionId: parentId },
		});

	it('runs the Execute Sub-workflow node: the sub-execution runs as its own execution and the node returns its items', async () => {
		const resolveSubWorkflow = resolverFor();

		const { execution, byNode } = await runWorkflow(
			parentWorkflow(),
			[[{ json: { name: 'ada' } }]],
			'manual',
			{ resolveSubWorkflow, finishCount: 2 },
		);

		expect(execution.status).toBe('completed');
		const subExecution = await subExecutionOf(execution.id);
		expect(subExecution.status).toBe('completed');
		expect(subExecution.parentStepId).toBe(byNode('exec')?.id);
		expect(subExecution.parentAwaited).toBe(true);
		expect(subExecution.mode).toBe('manual');

		// The items the sub-execution's last node produced, paired to the node's input.
		const exec = byNode('exec');
		expect(exec?.status).toBe('completed');
		expect(exec?.resumeCause).toMatchObject({
			kind: 'subExecution',
			executionId: subExecution.id,
			status: 'completed',
		});
		expect(exec?.outputs).toEqual([
			[{ json: { fromSubWorkflow: 'yes' }, pairedItem: { item: 0 } }],
		]);
		expect(byNode('after')?.outputs).toEqual([
			[expect.objectContaining({ json: expect.objectContaining({ after: 'ran' }) as object })],
		]);

		// Resolved once, for the parent, with the items the node handed over.
		expect(resolveSubWorkflow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				workflowId: 'sub-workflow',
				parent: expect.objectContaining({ executionId: execution.id, mode: 'manual' }) as object,
				// As the node hands them over: paired to its input.
				items: [expect.objectContaining({ json: { name: 'ada' } })],
			}),
		);
		const subExecutionSteps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId: subExecution.id } });
		expect(subExecutionSteps.map(({ nodeId, status }) => [nodeId, status])).toEqual(
			expect.arrayContaining([
				['sub-trigger', 'completed'],
				['sub-workflow-set', 'completed'],
			]),
		);
	});

	it('runs a fire-and-forget call: the node returns its input at once and the sub-execution runs on', async () => {
		const { execution, byNode } = await runWorkflow(
			parentWorkflow({ waitForSubWorkflow: false }),
			[[{ json: { name: 'ada' } }]],
			'manual',
			{ resolveSubWorkflow: resolverFor(), finishCount: 2 },
		);

		expect(execution.status).toBe('completed');
		const subExecution = await subExecutionOf(execution.id);
		expect(subExecution.status).toBe('completed');
		expect(subExecution.parentAwaited).toBe(false);

		const exec = byNode('exec');
		expect(exec?.waitDeclaration).toBeNull();
		expect(exec?.resumeCause).toBeNull();
		expect(exec?.outputs).toEqual([[expect.objectContaining({ json: { name: 'ada' } })]]);
	});

	it('fails the Execute Sub-workflow node with the sub-execution error when the sub-execution fails', async () => {
		// The sub-workflow's Set node references a node that is not there, so the sub-execution fails.
		const failing = subWorkflowFixture({
			name: 'broken',
			value: "={{ $('Nope').first().json.x }}",
			type: 'string',
		});

		const { execution, byNode } = await runWorkflow(
			parentWorkflow(),
			[[{ json: { name: 'ada' } }]],
			'manual',
			{ resolveSubWorkflow: resolverFor(failing), finishCount: 2 },
		);

		expect(execution.status).toBe('failed');
		const subExecution = await subExecutionOf(execution.id);
		expect(subExecution.status).toBe('failed');

		const exec = byNode('exec');
		expect(exec?.status).toBe('failed');
		expect(exec?.resumeCause).toMatchObject({ kind: 'subExecution', status: 'failed' });
		expect(exec?.error?.message).toBe("Referenced node doesn't exist");
		expect(byNode('after')).toBeUndefined();
	});
});
