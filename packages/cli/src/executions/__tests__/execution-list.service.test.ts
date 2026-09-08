import type { ExecutionSummaries, User, ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { EngineV2ExecutionReader } from '../engine-v2-execution-reader.service';
import { parseExecutionCursor } from '../execution-cursor';
import { ExecutionListService } from '../execution-list.service';
import type { ExecutionService } from '../execution.service';

describe('ExecutionListService', () => {
	const executions = mock<ExecutionRepository>();
	const workflows = mock<WorkflowRepository>();
	const executionService = mock<ExecutionService>();
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const reader = new EngineV2ExecutionReader(dataPlane);
	const service = new ExecutionListService(
		executions,
		workflows,
		executionService,
		reader,
		dataPlane,
	);
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
	const uuid = '01992380-0000-7000-8000-000000000001';
	const time = '2026-09-07T12:00:00.000Z';

	beforeEach(() => {
		vi.resetAllMocks();
		dataPlane.isAvailable.mockReturnValue(true);
		dataPlane.searchExecutions.mockResolvedValue({ items: [], hasMore: false, total: 0 });
		workflows.findWorkflowIdsForExecutionList.mockResolvedValue(['wf-a']);
		workflows.findNamesForExecutionList.mockResolvedValue([{ id: 'wf-a', name: 'Workflow A' }]);
		executions.findManyByRangeQuery.mockResolvedValue([]);
		executionService.getExecutionsCountForQuery.mockResolvedValue({ count: 0, estimated: false });
	});

	it('sends only the member visibility set and resolves it again on the next request', async () => {
		await service.findMany(query());
		expect(dataPlane.searchExecutions).toHaveBeenLastCalledWith(
			expect.objectContaining({ workflowIds: ['wf-a'] }),
		);
		workflows.findWorkflowIdsForExecutionList.mockResolvedValue(['wf-b']);
		await service.findMany(query());
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
		await service.findMany(query({ workflowId: 'denied' }));
		expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
	});

	it.each<Partial<ExecutionSummaries.RangeQuery>>([
		{ metadata: [{ key: 'k', value: 'v', exactMatch: true }] },
		{ annotationTags: ['tag'] },
		{ vote: 'up' },
		{ workflowVersionId: 'version' },
		{ id: '1' },
	])('skips the DP for a CP-only filter %s', async (filter) => {
		await service.findMany(query(filter));
		expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
	});

	it('keeps v1 available when the module is disabled', async () => {
		dataPlane.isAvailable.mockReturnValue(false);
		executionService.getExecutionsCountForQuery.mockResolvedValue({ count: 7, estimated: false });
		expect(await service.findMany(query())).toMatchObject({ count: 7, nextCursor: null });
		expect(workflows.findWorkflowIdsForExecutionList).not.toHaveBeenCalled();
		expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
	});

	it('fails instead of reporting a partial list when the DP fails', async () => {
		dataPlane.searchExecutions.mockRejectedValue(new Error('unavailable'));
		await expect(service.findMany(query())).rejects.toThrow('unavailable');
	});

	it('merges sources, enriches names, and counts without cursor bounds', async () => {
		dataPlane.searchExecutions.mockResolvedValue({
			items: [
				{
					id: uuid,
					workflowId: 'wf-a',
					status: 'completed',
					mode: 'manual',
					createdAt: time,
					updatedAt: time,
					finishedAt: time,
				},
			],
			hasMore: false,
			total: 3,
		});
		executions.findManyByRangeQuery.mockResolvedValue([
			{
				id: '10',
				workflowId: 'wf-a',
				status: 'success',
				mode: 'manual',
				createdAt: new Date(time),
				startedAt: null,
			},
		]);
		executionService.getExecutionsCountForQuery.mockResolvedValue({ count: 5, estimated: true });
		const result = await service.findMany(query({ range: { limit: 1 } }));
		expect(result).toMatchObject({
			count: 8,
			estimated: true,
			results: [{ id: uuid, workflowName: 'Workflow A' }],
		});
		expect(parseExecutionCursor(result.nextCursor!)!.v1).toBeUndefined();
		expect(executionService.getExecutionsCountForQuery).toHaveBeenCalledWith(
			expect.not.objectContaining({ range: expect.anything() }),
		);
	});

	it('preserves the unknown-count sentinel', async () => {
		executionService.getExecutionsCountForQuery.mockResolvedValue({ count: -1, estimated: false });
		dataPlane.searchExecutions.mockResolvedValue({ items: [], total: 20, hasMore: false });
		expect(await service.findMany(query())).toMatchObject({ count: -1 });
	});

	it('never sends a UUID filter to the v1 repository', async () => {
		await service.findMany(query({ id: uuid }));
		expect(executions.findManyByRangeQuery).not.toHaveBeenCalled();
		expect(executionService.getExecutionsCountForQuery).not.toHaveBeenCalled();
	});

	it('keeps current searches outside the completed continuation', async () => {
		await service.findMany(query({ status: undefined }));
		expect(dataPlane.searchExecutions.mock.calls.map(([request]) => request)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					status: ['completed', 'failed', 'cancelled'],
					includeTotal: true,
				}),
				expect.objectContaining({ status: ['running'], includeTotal: false, before: undefined }),
				expect.objectContaining({ status: ['queued'], includeTotal: false, before: undefined }),
			]),
		);
	});

	it('bounds parallel searches across current and completed batches', async () => {
		workflows.findWorkflowIdsForExecutionList.mockResolvedValue(
			Array.from({ length: 40_001 }, (_, i) => `wf-${i}`),
		);
		let active = 0;
		let maximum = 0;
		dataPlane.searchExecutions.mockImplementation(async () => {
			active++;
			maximum = Math.max(maximum, active);
			await new Promise<void>((resolve) => setImmediate(resolve));
			active--;
			return { items: [], total: 0, hasMore: false };
		});
		await service.findMany(query({ status: undefined }));
		expect(maximum).toBeLessThanOrEqual(4);
		expect(dataPlane.searchExecutions).toHaveBeenCalledTimes(15);
	});
});
