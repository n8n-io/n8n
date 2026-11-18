import type { AquariumEntity, EntitySource, MetricsSource } from '../aquarium.types';
import { toAgentEntity } from './agents.source';
import { toExecutionPatches } from './executions.source';
import { toInsightsPatches } from './insights.source';
import { toSecurityPatches } from './security.source';
import { emptyMetrics, loadFromSources } from './source.utils';
import { toWorkflowEntity } from './workflows.source';

const context = { restApiContext: { baseUrl: '/rest', pushRef: 'test' } };

const workflow: AquariumEntity = {
	key: 'workflow:1',
	id: '1',
	kind: 'workflow',
	name: 'One',
	metrics: { ...emptyMetrics(), complexity: 3 },
};

describe('loadFromSources', () => {
	it('merges metrics into entities, and later sources win', async () => {
		const entities: EntitySource = { id: 'e', load: async () => [workflow] };
		const first: MetricsSource = {
			id: 'first',
			load: async () => [{ key: 'workflow:1', metrics: { executionCount: 5, failedCount: 1 } }],
		};
		const second: MetricsSource = {
			id: 'second',
			load: async () => [{ key: 'workflow:1', metrics: { executionCount: 50 } }],
		};

		const result = await loadFromSources(context, [entities], [first, second]);

		expect(result.entities[0].metrics).toEqual({
			complexity: 3,
			executionCount: 50,
			failedCount: 1,
			averageRunTimeMs: 0,
			waitingCount: 0,
			finishedCount: 0,
		});
	});

	it('ignores metrics for unknown entities', async () => {
		const entities: EntitySource = { id: 'e', load: async () => [workflow] };
		const metrics: MetricsSource = {
			id: 'm',
			load: async () => [{ key: 'workflow:404', metrics: { executionCount: 5 } }],
		};

		const result = await loadFromSources(context, [entities], [metrics]);

		expect(result.entities).toHaveLength(1);
	});

	it('reports failed sources and keeps the data of the others', async () => {
		const entities: EntitySource = { id: 'e', load: async () => [workflow] };
		const broken: EntitySource = {
			id: 'broken',
			load: async () => await Promise.reject(new Error('403')),
		};
		const brokenMetrics: MetricsSource = {
			id: 'broken-metrics',
			load: async () => await Promise.reject(new Error('403')),
		};

		const result = await loadFromSources(context, [entities, broken], [brokenMetrics]);

		expect(result.entities).toHaveLength(1);
		expect(result.failedSources).toEqual(['broken', 'broken-metrics']);
	});
});

describe('source mappers', () => {
	it('counts workflow nodes without sticky notes', () => {
		const entity = toWorkflowEntity({
			id: 'w',
			name: 'W',
			nodes: [{ type: 'n8n-nodes-base.set' }, { type: 'n8n-nodes-base.stickyNote' }],
		});

		expect(entity.key).toBe('workflow:w');
		expect(entity.metrics.complexity).toBe(1);
	});

	it('reads the build and the error workflow of a workflow', () => {
		const entity = toWorkflowEntity({
			id: 'w',
			name: 'W',
			nodes: [
				{ type: 'n8n-nodes-base.code', parameters: { jsCode: 'x' } },
				{ type: 'n8n-nodes-base.wait', parameters: {} },
			],
			settings: { errorWorkflow: 'handler' },
		});

		expect(entity.design).toMatchObject({
			nodeCount: 2,
			codeNodeCount: 1,
			waitNodeCount: 1,
			hasErrorWorkflow: true,
		});
	});

	it('reads the creation time of a workflow', () => {
		const entity = toWorkflowEntity({ id: 'w', name: 'W', createdAt: '2025-01-01T00:00:00.000Z' });

		expect(entity.createdAt).toBe('2025-01-01T00:00:00.000Z');
	});

	it('reads the owning project of a workflow and an agent', () => {
		const project = { id: 'p1', name: 'Sales', type: 'team' };

		expect(toWorkflowEntity({ id: 'w', name: 'W', homeProject: project }).project).toEqual(project);
		expect(toAgentEntity({ id: 'a', name: 'A', projectId: 'p1', project }).project).toEqual(
			project,
		);
		expect(toWorkflowEntity({ id: 'w', name: 'W', homeProject: null }).project).toBeUndefined();
	});

	it('uses the skill count as agent complexity', () => {
		const entity = toAgentEntity({
			id: 'a',
			name: 'A',
			projectId: 'p',
			skillVersions: { s1: {}, s2: {} },
		});

		expect(entity.key).toBe('agent:a');
		expect(entity.metrics.complexity).toBe(3);
	});

	it('aggregates executions by workflow', () => {
		const patches = toExecutionPatches([
			{
				id: '1',
				workflowId: 'w',
				status: 'success',
				startedAt: new Date(0),
				stoppedAt: new Date(100),
			},
			{
				id: '2',
				workflowId: 'w',
				status: 'error',
				startedAt: new Date(0),
				stoppedAt: new Date(300),
			},
			{ id: '3', workflowId: 'w', status: 'running', startedAt: new Date(0) },
			{ id: '4', workflowId: 'w', status: 'waiting', startedAt: new Date(0) },
		]);

		// The paused run counts as waiting, not as a failure.
		expect(patches).toEqual([
			{
				key: 'workflow:w',
				metrics: {
					executionCount: 4,
					failedCount: 1,
					averageRunTimeMs: 200,
					waitingCount: 1,
					// Success and error ended. Running and waiting did not.
					finishedCount: 2,
				},
			},
		]);
	});

	it('maps insights rows and skips deleted workflows', () => {
		const row = {
			workflowName: 'W',
			hasReadAccess: true,
			projectId: 'p',
			projectName: 'P',
			total: 10,
			succeeded: 8,
			failed: 2,
			failureRate: 0.2,
			runTime: 1000,
			averageRunTime: 100,
			timeSaved: 0,
		};

		const patches = toInsightsPatches({
			count: 2,
			data: [
				{ ...row, workflowId: 'w' },
				{ ...row, workflowId: null },
			],
		});

		expect(patches).toEqual([
			{
				key: 'workflow:w',
				metrics: { executionCount: 10, finishedCount: 10, failedCount: 2, averageRunTimeMs: 100 },
			},
		]);
	});

	it('counts the security risks of each workflow', () => {
		const patches = toSecurityPatches({
			workflows: [{ workflowId: 'w', risks: ['unprotectedWebhook', 'shellAccess'] }],
		});

		expect(patches).toEqual([{ key: 'workflow:w', metrics: { securityRisks: 2 } }]);
	});
});

describe('executionsSource', () => {
	it('follows the next cursor to load more pages', async () => {
		const restApiClient = await import('@n8n/rest-api-client');
		const execution = (id: string) => ({
			id,
			workflowId: 'w',
			status: 'success' as const,
			startedAt: new Date(0),
			stoppedAt: new Date(10),
		});
		const request = vi
			.spyOn(restApiClient, 'makeRestApiRequest')
			.mockResolvedValueOnce({ results: [execution('2')], nextCursor: 'next-page' })
			.mockResolvedValueOnce({ results: [execution('1')], nextCursor: null });
		const { executionsSource } = await import('./executions.source');

		const patches = await executionsSource.load(context);

		expect(request).toHaveBeenCalledTimes(2);
		expect(request.mock.calls[1][3]).toEqual({ limit: 100, cursor: 'next-page' });
		expect(patches[0].metrics.executionCount).toBe(2);
	});
});
