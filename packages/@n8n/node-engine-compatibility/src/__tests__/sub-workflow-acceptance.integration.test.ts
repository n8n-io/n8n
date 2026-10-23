import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { converter, mainTo, makeRunWorkflow, setNode, TRIGGER } from './acceptance-fixtures';
import { v1Workflow } from './fixtures';
import { toStepOutputs } from '../io';
import type { SubWorkflowResolveRequest, SubWorkflowResolver } from '../types';

const CHILD_TRIGGER = 'When Executed by Another Workflow';

/** The child: its trigger passes the items through, and a Set node marks them. */
function childWorkflow(assignment = { name: 'fromChild', value: 'yes', type: 'string' }) {
	return v1Workflow(
		[
			{
				id: 'child-trigger',
				name: CHILD_TRIGGER,
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1,
				parameters: {},
			},
			setNode('child-set', 'Mark', [assignment]),
		],
		{ [CHILD_TRIGGER]: mainTo('Mark') },
	);
}

/** The parent: an Execute Sub-workflow node calls `child`, then a Set node runs on what came back. */
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
					parameters: { source: 'database', workflowId: 'child', mode: 'once', options },
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
 * What the control plane answers: the child's graph, and its trigger outputs
 * from the items the parent handed over, passed through as the trigger does.
 */
function resolverFor(child = childWorkflow()): SubWorkflowResolver {
	return vi.fn(async (request: SubWorkflowResolveRequest) => {
		return await Promise.resolve({
			workflowId: request.workflowId,
			graph: converter.convert(child, CHILD_TRIGGER),
			workflow: { id: request.workflowId, name: 'Child' },
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
	const childOf = async (parentId: string) =>
		await dataSource.getRepository(WorkflowExecution).findOneOrFail({
			where: { parentExecutionId: parentId },
		});

	it('runs the Execute Sub-workflow node: the child runs as its own execution and the node returns its items', async () => {
		const resolveSubWorkflow = resolverFor();

		const { execution, byNode } = await runWorkflow(
			parentWorkflow(),
			[[{ json: { name: 'ada' } }]],
			'manual',
			{ resolveSubWorkflow, finishCount: 2 },
		);

		expect(execution.status).toBe('completed');
		const child = await childOf(execution.id);
		expect(child.status).toBe('completed');
		expect(child.parentStepId).toBe(byNode('exec')?.id);
		expect(child.parentAwaited).toBe(true);
		expect(child.mode).toBe('manual');

		// The items the child's last node produced, paired to the node's input.
		const exec = byNode('exec');
		expect(exec?.status).toBe('completed');
		expect(exec?.resumeCause).toMatchObject({
			kind: 'child',
			executionId: child.id,
			status: 'completed',
		});
		expect(exec?.outputs).toEqual([[{ json: { fromChild: 'yes' }, pairedItem: { item: 0 } }]]);
		expect(byNode('after')?.outputs).toEqual([
			[expect.objectContaining({ json: expect.objectContaining({ after: 'ran' }) as object })],
		]);

		// Resolved once, for the parent, with the items the node handed over.
		expect(resolveSubWorkflow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				workflowId: 'child',
				parent: expect.objectContaining({ executionId: execution.id, mode: 'manual' }) as object,
				// As the node hands them over: paired to its input.
				items: [expect.objectContaining({ json: { name: 'ada' } })],
			}),
		);
		const childSteps = await dataSource
			.getRepository(WorkflowStepExecution)
			.find({ where: { executionId: child.id } });
		expect(childSteps.map(({ nodeId, status }) => [nodeId, status])).toEqual(
			expect.arrayContaining([
				['child-trigger', 'completed'],
				['child-set', 'completed'],
			]),
		);
	});

	it('runs a fire-and-forget call: the node returns its input at once and the child runs on', async () => {
		const { execution, byNode } = await runWorkflow(
			parentWorkflow({ waitForSubWorkflow: false }),
			[[{ json: { name: 'ada' } }]],
			'manual',
			{ resolveSubWorkflow: resolverFor(), finishCount: 2 },
		);

		expect(execution.status).toBe('completed');
		const child = await childOf(execution.id);
		expect(child.status).toBe('completed');
		expect(child.parentAwaited).toBe(false);

		const exec = byNode('exec');
		expect(exec?.waitDeclaration).toBeNull();
		expect(exec?.resumeCause).toBeNull();
		expect(exec?.outputs).toEqual([[expect.objectContaining({ json: { name: 'ada' } })]]);
	});

	it('fails the Execute Sub-workflow node with the child error when the child fails', async () => {
		// The child's Set node references a node that is not there, so the child fails.
		const failing = childWorkflow({
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
		const child = await childOf(execution.id);
		expect(child.status).toBe('failed');

		const exec = byNode('exec');
		expect(exec?.status).toBe('failed');
		expect(exec?.resumeCause).toMatchObject({ kind: 'child', status: 'failed' });
		expect(exec?.error?.message).toBe("Referenced node doesn't exist");
		expect(byNode('after')).toBeUndefined();
	});
});
