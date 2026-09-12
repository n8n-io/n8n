import type { ExecutionSummaries } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import {
	COMPLETED_STATUSES,
	type ExecutionListV1Service,
} from '@/executions/execution-list-v1.service';
import { ExecutionListService } from '@/executions/execution-list.service';
import type { RoleService } from '@/services/role.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

describe('ExecutionListService', () => {
	const v1Service = mock<ExecutionListV1Service>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const roleService = mock<RoleService>();

	const service = new ExecutionListService(v1Service, workflowSharingService, roleService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listExecutionsForUI', () => {
		const QUERIES_WITH_STATUS_OR_CURSOR: ExecutionSummaries.RangeQuery[] = [
			{ kind: 'range', status: ['waiting'], range: { limit: 20 } },
			{ kind: 'range', status: ['waiting'], range: { limit: 20, beforeId: '999' } },
			{ kind: 'range', status: undefined, range: { limit: 20, beforeId: '999' } },
			{ kind: 'range', status: [], range: { limit: 20, beforeId: '999' } },
		];

		const QUERIES_WITHOUT_STATUS_OR_CURSOR: ExecutionSummaries.RangeQuery[] = [
			{ kind: 'range', status: undefined, range: { limit: 20 } },
			{ kind: 'range', status: [], range: { limit: 20 } },
		];

		test.each(QUERIES_WITH_STATUS_OR_CURSOR)(
			'pages a single block when a status filter or a cursor is given',
			async (query) => {
				await service.listExecutionsForUI(query);

				expect(v1Service.findPageWithCount).toHaveBeenCalledWith(query);
				expect(v1Service.findCurrentAndCompleted).not.toHaveBeenCalled();
			},
		);

		test.each(QUERIES_WITHOUT_STATUS_OR_CURSOR)(
			'combines the current and completed blocks on the first page',
			async (query) => {
				await service.listExecutionsForUI(query);

				expect(v1Service.findCurrentAndCompleted).toHaveBeenCalledWith({
					...query,
					status: COMPLETED_STATUSES,
				});
				expect(v1Service.findPageWithCount).not.toHaveBeenCalled();
			},
		);
	});

	describe('addScopes', () => {
		it('assigns each summary the scopes of its workflow', async () => {
			workflowSharingService.getSharedWorkflowScopes.mockResolvedValue([
				['wf-1', ['workflow:read']],
			]);
			const summaries = [
				mock<ExecutionSummaries.ExecutionSummaryWithScopes>({ workflowId: 'wf-1' }),
				mock<ExecutionSummaries.ExecutionSummaryWithScopes>({ workflowId: 'wf-2' }),
			];

			await service.addScopes(mock(), summaries);

			expect(summaries[0].scopes).toEqual(['workflow:read']);
			expect(summaries[1].scopes).toEqual([]);
		});
	});

	describe('buildSharingOptions', () => {
		it('resolves the roles that carry the scope', async () => {
			roleService.rolesWithScope
				.mockResolvedValueOnce(['project:admin'])
				.mockResolvedValueOnce(['workflow:owner']);

			const options = await service.buildSharingOptions('workflow:read');

			expect(options).toEqual({
				scopes: ['workflow:read'],
				projectRoles: ['project:admin'],
				workflowRoles: ['workflow:owner'],
			});
		});
	});
});
