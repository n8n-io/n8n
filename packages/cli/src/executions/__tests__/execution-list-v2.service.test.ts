import type { DatabaseConfig } from '@n8n/config';
import type {
	ExecutionListRepository,
	ExecutionRepository,
	ExecutionSummaries,
	User,
} from '@n8n/db';
import type { ExecutionListItem } from '@n8n/engine';
import type { ExecutionSummary } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { EngineV2ExecutionReader } from '../engine-v2-execution-reader.service';
import { parseExecutionCursor } from '../execution-cursor';
import { COMPLETED_STATUSES, ExecutionListV1Service } from '../execution-list-v1.service';
import { ExecutionListV2Service } from '../execution-list-v2.service';

describe('ExecutionListV2Service', () => {
	const executions = mock<ExecutionRepository>();
	const workflows = mock<ExecutionListRepository>();
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const databaseConfig = mock<DatabaseConfig>();
	const reader = new EngineV2ExecutionReader(dataPlane);
	// The real v1 service, so the control-plane queries it builds are asserted too.
	const v1Service = new ExecutionListV1Service(databaseConfig, executions);
	const service = new ExecutionListV2Service(v1Service, executions, workflows, reader, dataPlane);

	const member = mock<User>({ id: 'member', role: { slug: 'global:member', scopes: [] } });
	const owner = mock<User>({
		id: 'owner',
		role: { slug: 'global:owner', scopes: [{ slug: 'workflow:read' }] },
	});
	const query = (
		overrides: Partial<ExecutionSummaries.RangeQuery> = {},
	): ExecutionSummaries.RangeQuery => ({
		kind: 'range',
		user: member,
		sharingOptions: { projectRoles: ['project:viewer'], workflowRoles: ['workflow:editor'] },
		range: { limit: 2 },
		status: ['success'],
		...overrides,
	});

	/** The `query` above, as the caller narrows it when the two blocks combine. */
	const completedPageQuery = (overrides: Partial<ExecutionSummaries.RangeQuery> = {}) =>
		query({ order: { startedAt: 'DESC' }, status: COMPLETED_STATUSES, ...overrides });

	const uuid = '01992380-0000-7000-8000-000000000001';
	const uuid2 = '01992380-0000-7000-8000-000000000002';
	const time = '2026-09-07T12:00:00.000Z';

	const v2Item = (
		id: string,
		status: ExecutionListItem['status'] = 'completed',
	): ExecutionListItem =>
		({
			id,
			workflowId: 'wf-a',
			status,
			mode: 'manual',
			createdAt: time,
			updatedAt: time,
			finishedAt: time,
		}) as ExecutionListItem;
	const v1Row = (id: string, status: ExecutionSummary['status'] = 'success') =>
		mock<ExecutionSummary>({
			id,
			workflowId: 'wf-a',
			status,
			mode: 'manual',
			createdAt: new Date(time),
			startedAt: new Date(time),
		});

	/** Every data-plane search request this call made. */
	const searchRequests = () => dataPlane.searchExecutions.mock.calls.map(([request]) => request);
	/** Every control-plane range query this call made. */
	const rangeQueries = () => executions.findManyByRangeQuery.mock.calls.map(([q]) => q);

	beforeEach(() => {
		vi.resetAllMocks();
		databaseConfig.type = 'sqlite';
		dataPlane.isAvailable.mockReturnValue(true);
		dataPlane.searchExecutions.mockResolvedValue({ items: [], nextCursor: null, total: 0 });
		workflows.findWorkflowIdsForExecutionList.mockResolvedValue(['wf-a']);
		workflows.findNamesForExecutionList.mockResolvedValue([{ id: 'wf-a', name: 'Workflow A' }]);
		executions.findManyByRangeQuery.mockResolvedValue([]);
		executions.fetchCount.mockResolvedValue(0);
	});

	describe('scope', () => {
		it('sends only the member visibility set and resolves it again on the next request', async () => {
			await service.findPageWithCount(query());
			expect(dataPlane.searchExecutions).toHaveBeenLastCalledWith(
				expect.objectContaining({ workflowIds: ['wf-a'] }),
			);

			workflows.findWorkflowIdsForExecutionList.mockResolvedValue(['wf-b']);
			await service.findPageWithCount(query());
			expect(dataPlane.searchExecutions).toHaveBeenLastCalledWith(
				expect.objectContaining({ workflowIds: ['wf-b'] }),
			);
		});

		it('uses all for a global reader without workflow restrictions', async () => {
			expect(await service.resolveV2Scope(query({ user: owner }))).toBe('all');
			expect(workflows.findWorkflowIdsForExecutionList).not.toHaveBeenCalled();
		});

		it('resolves workflow attributes even for a global reader', async () => {
			const filtered = query({ user: owner, projectId: 'shared-project', isArchived: false });

			expect(await service.resolveV2Scope(filtered)).toEqual(['wf-a']);
			expect(workflows.findWorkflowIdsForExecutionList).toHaveBeenCalledWith(filtered);
		});

		it('skips the DP for an inaccessible workflow', async () => {
			workflows.findWorkflowIdsForExecutionList.mockResolvedValue([]);

			await service.findPageWithCount(query({ workflowId: 'denied' }));

			expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
		});
	});

	// The DP search has no equivalent for these filters, so the query is answered
	// from the control plane alone rather than rejected.
	describe('control-plane-only filters', () => {
		const cpOnly: Array<Partial<ExecutionSummaries.RangeQuery>> = [
			{ metadata: [{ key: 'k', value: 'v', exactMatch: true }] },
			{ annotationTags: ['tag'] },
			{ vote: 'up' },
			{ workflowVersionId: 'version' },
		];

		it.each(cpOnly)('skips the DP for %s', async (filter) => {
			await service.findPageWithCount(query(filter));

			expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
		});

		it.each(cpOnly)('still reports the v1 page for %s', async (filter) => {
			executions.findManyByRangeQuery.mockResolvedValue([v1Row('10')]);
			executions.fetchCount.mockResolvedValue(4);

			const result = await service.findPageWithCount(query(filter));

			expect(result.results.map((r) => r.id)).toEqual(['10']);
			expect(result.count).toBe(4);
		});
	});

	describe('merging', () => {
		it('merges both stores, enriches v2 names, and sums the counts', async () => {
			dataPlane.searchExecutions.mockResolvedValue({
				items: [v2Item(uuid)],
				nextCursor: null,
				total: 3,
			});
			executions.findManyByRangeQuery.mockResolvedValue([v1Row('10')]);
			executions.fetchCount.mockResolvedValue(5);

			const result = await service.findPageWithCount(query({ range: { limit: 1 } }));

			expect(result).toMatchObject({
				count: 8,
				estimated: false,
				results: [{ id: uuid, workflowName: 'Workflow A' }],
			});
			// Only a v2 row made the page, so the v1 position stays untouched.
			expect(parseExecutionCursor(result.nextCursor!).v1).toBeUndefined();
		});

		it('preserves the unknown-count sentinel instead of adding to it', async () => {
			databaseConfig.type = 'postgresdb';
			executions.getLiveExecutionRowsOnPostgres.mockResolvedValue(-1);
			dataPlane.searchExecutions.mockResolvedValue({ items: [], total: 20, nextCursor: null });

			expect(await service.findPageWithCount(query())).toMatchObject({ count: -1 });
		});

		it('counts without the cursor bounds', async () => {
			await service.findPageWithCount(query());

			expect(executions.fetchCount).toHaveBeenCalledWith(
				expect.not.objectContaining({ range: expect.anything() }),
			);
		});

		it('fails instead of reporting a partial list when the DP fails', async () => {
			dataPlane.searchExecutions.mockRejectedValue(new Error('unavailable'));

			await expect(service.findPageWithCount(query())).rejects.toThrow('unavailable');
		});

		it('asks the control plane for one row past the page, to detect more', async () => {
			await service.findPageWithCount(query({ range: { limit: 2 } }));

			expect(rangeQueries()[0].range.limit).toBe(3);
		});

		it('bounds the control plane page by the cursor, else by a caller beforeId', async () => {
			const cursor = { version: 1 as const, v1: { id: '10', timestamp: time } };

			await service.findPageWithCount(query({ range: { limit: 2, beforeId: '99' } }), cursor);
			expect(rangeQueries()[0].range.beforeId).toBe('10');

			executions.findManyByRangeQuery.mockClear();
			await service.findPageWithCount(query({ range: { limit: 2, beforeId: '99' } }));
			expect(rangeQueries()[0].range.beforeId).toBe('99');
		});
	});

	describe('findCurrentAndCompleted', () => {
		it('searches current outside the completed continuation', async () => {
			await service.findCurrentAndCompleted(completedPageQuery());

			expect(searchRequests()).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						status: ['completed', 'failed', 'cancelled'],
						includeTotal: true,
					}),
					expect.objectContaining({
						status: ['queued', 'running'],
						includeTotal: false,
						order: { top: 'running' },
					}),
				]),
			);
		});

		it('puts running executions at the top of the current block', async () => {
			executions.findManyByRangeQuery.mockImplementation(async (q) =>
				q.status?.includes('running') ? [v1Row('20', 'new')] : [],
			);
			dataPlane.searchExecutions.mockImplementation(async (request) =>
				request.status?.includes('running')
					? { items: [v2Item(uuid, 'running')], nextCursor: null, total: 0 }
					: { items: [], nextCursor: null, total: 0 },
			);

			const result = await service.findCurrentAndCompleted(completedPageQuery());

			expect(result.results.map((r) => r.status)).toEqual(['running', 'new']);
		});

		it('lets the current block exceed the limit, since each store contributes up to it', async () => {
			executions.findManyByRangeQuery.mockImplementation(async (q) =>
				q.status?.includes('running') ? [v1Row('20', 'running'), v1Row('19', 'running')] : [],
			);
			dataPlane.searchExecutions.mockImplementation(async (request) =>
				request.status?.includes('running')
					? {
							items: [v2Item(uuid, 'running'), v2Item(uuid2, 'running')],
							nextCursor: null,
							total: 0,
						}
					: { items: [], nextCursor: null, total: 0 },
			);

			const result = await service.findCurrentAndCompleted(
				completedPageQuery({ range: { limit: 2 } }),
			);

			expect(result.results).toHaveLength(4);
		});
	});

	describe('findPageWithCount', () => {
		it('never combines the blocks, so a status-less query pages every status', async () => {
			await service.findPageWithCount(query({ status: undefined }));

			expect(rangeQueries()).toHaveLength(1);
			expect(rangeQueries()[0].status).toBeUndefined();
			expect(searchRequests()).toHaveLength(1);
			expect(searchRequests()[0].status).toEqual([
				'queued',
				'running',
				'completed',
				'failed',
				'cancelled',
			]);
		});

		it('resolves v2 workflow names', async () => {
			dataPlane.searchExecutions.mockResolvedValue({
				items: [v2Item(uuid)],
				nextCursor: null,
				total: 1,
			});

			const result = await service.findPageWithCount(query());

			expect(result.results).toEqual([expect.objectContaining({ workflowName: 'Workflow A' })]);
		});
	});

	describe('scope wider than one data plane search', () => {
		it('fails rather than reporting a list missing engine 2.0 rows', async () => {
			workflows.findWorkflowIdsForExecutionList.mockResolvedValue(
				Array.from({ length: 10_001 }, (_, i) => `wf-${i}`),
			);

			await expect(service.findPageWithCount(query())).rejects.toThrow(
				'Cannot search executions across more than 10000 workflows',
			);
		});
	});
});
