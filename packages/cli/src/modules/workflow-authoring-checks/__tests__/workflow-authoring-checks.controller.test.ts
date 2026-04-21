import type { WorkflowCheckResult } from '@n8n/api-types';
import type { AuthenticatedRequest, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowAuthoringChecksController } from '../workflow-authoring-checks.controller';
import type { WorkflowAuthoringChecksService } from '../workflow-authoring-checks.service';

describe('WorkflowAuthoringChecksController', () => {
	const req = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });

	const makeController = () => {
		const authoringChecksService = mock<WorkflowAuthoringChecksService>();
		const workflowFinderService = mock<WorkflowFinderService>();
		const workflowHistoryService = mock<WorkflowHistoryService>();
		const controller = new WorkflowAuthoringChecksController(
			authoringChecksService,
			workflowFinderService,
			workflowHistoryService,
		);
		return { controller, authoringChecksService, workflowFinderService, workflowHistoryService };
	};

	it('returns empty results + zero summary when no checks report violations', async () => {
		const { controller, authoringChecksService, workflowFinderService } = makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-current',
			nodes: [],
			connections: {},
			settings: undefined,
		} as unknown as WorkflowEntity);
		authoringChecksService.runAll.mockResolvedValue([]);

		const response = await controller.preview(req, undefined, 'wf-1', {});

		expect(response).toEqual({ results: [], summary: { blocking: 0, warning: 0 } });
		expect(authoringChecksService.runAll).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			nodes: [],
			connections: {},
			settings: undefined,
		});
	});

	it('aggregates severities in the summary', async () => {
		const { controller, authoringChecksService, workflowFinderService } = makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-current',
			nodes: [],
			connections: {},
		} as unknown as WorkflowEntity);
		const results: WorkflowCheckResult[] = [
			{ checkId: 'a', title: 'A', severity: 'warning', violations: [{ message: 'w1' }] },
			{ checkId: 'b', title: 'B', severity: 'blocking', violations: [{ message: 'b1' }] },
			{ checkId: 'c', title: 'C', severity: 'warning', violations: [{ message: 'w2' }] },
		];
		authoringChecksService.runAll.mockResolvedValue(results);

		const response = await controller.preview(req, undefined, 'wf-1', {});

		expect(response.results).toBe(results);
		expect(response.summary).toEqual({ blocking: 1, warning: 2 });
	});

	it('throws NotFoundError when the user has no access to the workflow', async () => {
		const { controller, workflowFinderService } = makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(controller.preview(req, undefined, 'missing', {})).rejects.toThrow(NotFoundError);
	});

	it('uses the current workflow draft when no versionId is provided', async () => {
		const { controller, authoringChecksService, workflowFinderService, workflowHistoryService } =
			makeController();
		const workflow = {
			id: 'wf-1',
			versionId: 'v-current',
			nodes: [{ id: 'n1' }],
			connections: { foo: {} },
			settings: { executionOrder: 'v1' },
		} as unknown as WorkflowEntity;
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		authoringChecksService.runAll.mockResolvedValue([]);

		await controller.preview(req, undefined, 'wf-1', {});

		expect(workflowHistoryService.getVersion).not.toHaveBeenCalled();
		expect(authoringChecksService.runAll).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
		});
	});

	it('does not load history when versionId matches the current draft', async () => {
		const { controller, authoringChecksService, workflowFinderService, workflowHistoryService } =
			makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-current',
			nodes: [],
			connections: {},
		} as unknown as WorkflowEntity);
		authoringChecksService.runAll.mockResolvedValue([]);

		await controller.preview(req, undefined, 'wf-1', { versionId: 'v-current' });

		expect(workflowHistoryService.getVersion).not.toHaveBeenCalled();
	});

	it('loads nodes and connections from workflow history when versionId differs from the draft', async () => {
		const { controller, authoringChecksService, workflowFinderService, workflowHistoryService } =
			makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-current',
			settings: undefined,
		} as unknown as WorkflowEntity);
		const historyNodes = [{ id: 'hist-node' }];
		const historyConnections = { hist: {} };
		workflowHistoryService.getVersion.mockResolvedValue({
			nodes: historyNodes,
			connections: historyConnections,
		} as never);
		authoringChecksService.runAll.mockResolvedValue([]);

		await controller.preview(req, undefined, 'wf-1', { versionId: 'v-old' });

		expect(workflowHistoryService.getVersion).toHaveBeenCalledWith(req.user, 'wf-1', 'v-old', {
			includePublishHistory: false,
		});
		expect(authoringChecksService.runAll).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			nodes: historyNodes,
			connections: historyConnections,
			settings: undefined,
		});
	});

	it('translates WorkflowHistoryVersionNotFoundError into NotFoundError', async () => {
		const { controller, workflowFinderService, workflowHistoryService } = makeController();
		workflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-current',
		} as unknown as WorkflowEntity);
		workflowHistoryService.getVersion.mockRejectedValue(
			new WorkflowHistoryVersionNotFoundError(''),
		);

		await expect(
			controller.preview(req, undefined, 'wf-1', { versionId: 'v-gone' }),
		).rejects.toThrow(NotFoundError);
	});

	describe('list', () => {
		it('returns all registered checks with their merged config', async () => {
			const { controller, authoringChecksService } = makeController();
			const checks = [
				{
					checkId: 'a',
					title: 'A',
					description: '',
					defaultSeverity: 'warning' as const,
					severityOverride: null,
					effectiveSeverity: 'warning' as const,
					enabled: true,
				},
			];
			authoringChecksService.listChecksWithConfig.mockResolvedValue(checks);

			const response = await controller.list();

			expect(response).toEqual({ checks });
		});
	});

	describe('updateConfig', () => {
		it('returns the updated config for a known check', async () => {
			const { controller, authoringChecksService } = makeController();
			const dto = {
				checkId: 'a',
				title: 'A',
				description: '',
				defaultSeverity: 'warning' as const,
				severityOverride: 'blocking' as const,
				effectiveSeverity: 'blocking' as const,
				enabled: false,
			};
			authoringChecksService.updateConfig.mockResolvedValue(dto);

			const response = await controller.updateConfig(req, undefined, 'a', {
				enabled: false,
				severityOverride: 'blocking',
			} as never);

			expect(authoringChecksService.updateConfig).toHaveBeenCalledWith('a', {
				enabled: false,
				severityOverride: 'blocking',
			});
			expect(response).toBe(dto);
		});

		it('throws NotFoundError when the check is not registered', async () => {
			const { controller, authoringChecksService } = makeController();
			authoringChecksService.updateConfig.mockResolvedValue(null);

			await expect(
				controller.updateConfig(req, undefined, 'missing', { enabled: true } as never),
			).rejects.toThrow(NotFoundError);
		});
	});
});
