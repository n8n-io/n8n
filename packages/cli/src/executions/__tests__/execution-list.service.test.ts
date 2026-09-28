import type { ExecutionSummaries, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import type { RoleService } from '@/services/role.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import type { ExecutionCursor } from '../execution-cursor';
import { COMPLETED_STATUSES, type ExecutionListV1Service } from '../execution-list-v1.service';
import { ExecutionListService } from '../execution-list.service';
import { ExecutionListV2Service } from '../execution-list-v2.service';

describe('ExecutionListService', () => {
	const v1Service = mock<ExecutionListV1Service>();
	const v2Service = mock<ExecutionListV2Service>();
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const roleService = mock<RoleService>();
	const service = new ExecutionListService(
		v1Service,
		dataPlane,
		workflowSharingService,
		roleService,
	);

	const query = (
		overrides: Partial<ExecutionSummaries.RangeQuery> = {},
	): ExecutionSummaries.RangeQuery => ({
		kind: 'range',
		range: { limit: 20 },
		...overrides,
	});

	/** The `query` above, as `listExecutionsForUI` narrows it when the two blocks combine. */
	const completedPageQuery = (overrides: Partial<ExecutionSummaries.RangeQuery> = {}) => ({
		...query(overrides),
		order: { startedAt: 'DESC' },
		status: COMPLETED_STATUSES,
	});

	const cursor: ExecutionCursor = {
		version: 1,
		v1: { id: '10', timestamp: '2026-09-07T12:00:00.000Z' },
		v2: {
			id: '01992380-0000-7000-8000-000000000001',
			timestamp: '2026-09-07T12:00:00.000Z',
		},
	};
	const page = { results: [], nextCursor: null, count: 0, estimated: false };

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(ExecutionListV2Service, v2Service);
		dataPlane.isAvailable.mockReturnValue(true);
		v1Service.findCurrentAndCompleted.mockResolvedValue(page);
		v1Service.findPageWithCount.mockResolvedValue(page);
		v2Service.findCurrentAndCompleted.mockResolvedValue(page);
		v2Service.findPageWithCount.mockResolvedValue(page);
	});

	describe('provider routing', () => {
		it('routes to v1 alone while the data plane is down', async () => {
			dataPlane.isAvailable.mockReturnValue(false);

			await service.findPageWithCount(query(), cursor);

			expect(v1Service.findPageWithCount).toHaveBeenCalledWith(query(), cursor);
			expect(v2Service.findPageWithCount).not.toHaveBeenCalled();
		});

		it('routes to the merged provider while the data plane is up', async () => {
			await service.findPageWithCount(query(), cursor);

			expect(v2Service.findPageWithCount).toHaveBeenCalledWith(query(), cursor);
			expect(v1Service.findPageWithCount).not.toHaveBeenCalled();
		});

		it('reads availability per request, so a late data plane is picked up', async () => {
			dataPlane.isAvailable.mockReturnValueOnce(false).mockReturnValueOnce(true);

			await service.findPageWithCount(query());
			await service.findPageWithCount(query());

			expect(v1Service.findPageWithCount).toHaveBeenCalledTimes(1);
			expect(v2Service.findPageWithCount).toHaveBeenCalledTimes(1);
		});
	});

	describe('listExecutionsForUI', () => {
		it('prepends the current block on the first page of a status-less list', async () => {
			await service.listExecutionsForUI(query());

			expect(v2Service.findCurrentAndCompleted).toHaveBeenCalledWith(completedPageQuery());
			expect(v2Service.findPageWithCount).not.toHaveBeenCalled();
		});

		it('keeps the completed filter on later pages, so "load more" never repeats current', async () => {
			await service.listExecutionsForUI(query(), cursor);

			expect(v2Service.findPageWithCount).toHaveBeenCalledWith(completedPageQuery(), cursor);
			expect(v2Service.findCurrentAndCompleted).not.toHaveBeenCalled();
		});

		it('treats a cursor holding no position as a first page', async () => {
			await service.listExecutionsForUI(query(), { version: 1 });

			expect(v2Service.findCurrentAndCompleted).toHaveBeenCalledWith(completedPageQuery());
		});

		it('honours an explicit status filter instead of combining current and completed', async () => {
			await service.listExecutionsForUI(query({ status: ['error'] }));

			expect(v2Service.findPageWithCount).toHaveBeenCalledWith(
				{ ...query({ status: ['error'] }), order: { startedAt: 'DESC' } },
				undefined,
			);
			expect(v2Service.findCurrentAndCompleted).not.toHaveBeenCalled();
		});

		it('orders every page by startedAt, so the merge and the cursor agree', async () => {
			await service.listExecutionsForUI(query({ status: ['error'] }), cursor);

			expect(v2Service.findPageWithCount.mock.calls[0][0].order).toEqual({ startedAt: 'DESC' });
		});
	});

	describe('findPageWithCount', () => {
		it('never combines nor reorders, so the caller query passes through', async () => {
			await service.findPageWithCount(query());

			expect(v2Service.findPageWithCount).toHaveBeenCalledWith(query(), undefined);
			expect(v2Service.findCurrentAndCompleted).not.toHaveBeenCalled();
		});
	});

	describe('buildSharingOptions', () => {
		it('resolves visibility from the role scopes, not from the sharing license', async () => {
			roleService.rolesWithScope.mockResolvedValueOnce(['project:viewer']);
			roleService.rolesWithScope.mockResolvedValueOnce(['workflow:editor']);

			expect(await service.buildSharingOptions('workflow:read')).toEqual({
				scopes: ['workflow:read'],
				projectRoles: ['project:viewer'],
				workflowRoles: ['workflow:editor'],
			});
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
		});
	});

	describe('addScopes', () => {
		it('assigns the workflow scopes onto each summary, deduplicating the lookup', async () => {
			workflowSharingService.getSharedWorkflowScopes.mockResolvedValue([
				['wf-a', ['workflow:read', 'workflow:execute']],
			]);
			const summaries = [
				{ id: '1', workflowId: 'wf-a' },
				{ id: '2', workflowId: 'wf-a' },
				{ id: '3', workflowId: 'wf-b' },
			] as ExecutionSummaries.ExecutionSummaryWithScopes[];
			const user = mock<User>({ id: 'user-1' });

			await service.addScopes(user, summaries);

			expect(workflowSharingService.getSharedWorkflowScopes).toHaveBeenCalledWith(
				['wf-a', 'wf-b'],
				user,
			);
			// A workflow the lookup did not report reads as no scopes, never undefined.
			expect(summaries.map((s) => s.scopes)).toEqual([
				['workflow:read', 'workflow:execute'],
				['workflow:read', 'workflow:execute'],
				[],
			]);
		});
	});
});
