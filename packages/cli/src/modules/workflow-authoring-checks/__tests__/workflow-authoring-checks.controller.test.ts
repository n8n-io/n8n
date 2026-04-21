import type { WorkflowCheckDto, WorkflowCheckResult } from '@n8n/api-types';
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

	describe('preview', () => {
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
				{
					checkInstanceId: 'a',
					type: 'node-has-direct-parent',
					name: 'A',
					severity: 'warning',
					violations: [{ message: 'w1' }],
				},
				{
					checkInstanceId: 'b',
					type: 'node-has-direct-parent',
					name: 'B',
					severity: 'blocking',
					violations: [{ message: 'b1' }],
				},
				{
					checkInstanceId: 'c',
					type: 'node-has-direct-parent',
					name: 'C',
					severity: 'warning',
					violations: [{ message: 'w2' }],
				},
			];
			authoringChecksService.runAll.mockResolvedValue(results);

			const response = await controller.preview(req, undefined, 'wf-1', {});

			expect(response.results).toBe(results);
			expect(response.summary).toEqual({ blocking: 1, warning: 2 });
		});

		it('throws NotFoundError when the user has no access to the workflow', async () => {
			const { controller, workflowFinderService } = makeController();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(controller.preview(req, undefined, 'missing', {})).rejects.toThrow(
				NotFoundError,
			);
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
	});

	describe('listTypes', () => {
		it('returns registered types', () => {
			const { controller, authoringChecksService } = makeController();
			authoringChecksService.listTypes.mockReturnValue([
				{
					type: 'node-has-direct-parent',
					title: 'Node has direct parent',
					description: '',
					defaultSeverity: 'warning',
					configSchema: { fields: [] },
				},
			]);

			const response = controller.listTypes();

			expect(response.types).toHaveLength(1);
		});
	});

	describe('list', () => {
		it('returns all instances', async () => {
			const { controller, authoringChecksService } = makeController();
			const checks: WorkflowCheckDto[] = [
				{
					id: 'i-1',
					name: 'Rule A',
					type: 'node-has-direct-parent',
					typeTitle: 'Node has direct parent',
					config: {},
					enabled: true,
					severity: 'warning',
				},
			];
			authoringChecksService.listInstances.mockResolvedValue(checks);

			const response = await controller.list();

			expect(response).toEqual({ checks });
		});
	});

	describe('create', () => {
		it('creates a new instance', async () => {
			const { controller, authoringChecksService } = makeController();
			const created: WorkflowCheckDto = {
				id: 'new-1',
				name: 'Rule',
				type: 'node-has-direct-parent',
				typeTitle: 'Node has direct parent',
				config: { childNodeType: 'a', parentNodeType: 'b' },
				enabled: true,
				severity: 'warning',
			};
			authoringChecksService.createInstance.mockResolvedValue(created);

			const response = await controller.create(req, undefined, {
				name: 'Rule',
				type: 'node-has-direct-parent',
				config: { childNodeType: 'a', parentNodeType: 'b' },
				severity: 'warning',
			} as never);

			expect(authoringChecksService.createInstance).toHaveBeenCalledWith({
				name: 'Rule',
				type: 'node-has-direct-parent',
				config: { childNodeType: 'a', parentNodeType: 'b' },
				severity: 'warning',
				enabled: undefined,
			});
			expect(response).toBe(created);
		});
	});

	describe('update', () => {
		it('returns the updated instance', async () => {
			const { controller, authoringChecksService } = makeController();
			const updated: WorkflowCheckDto = {
				id: 'i-1',
				name: 'Rule',
				type: 'node-has-direct-parent',
				typeTitle: 'Node has direct parent',
				config: {},
				enabled: false,
				severity: 'blocking',
			};
			authoringChecksService.updateInstance.mockResolvedValue(updated);

			const response = await controller.update(req, undefined, 'i-1', {
				enabled: false,
				severity: 'blocking',
			} as never);

			expect(authoringChecksService.updateInstance).toHaveBeenCalledWith('i-1', {
				name: undefined,
				config: undefined,
				severity: 'blocking',
				enabled: false,
			});
			expect(response).toBe(updated);
		});

		it('throws NotFoundError when the instance is missing', async () => {
			const { controller, authoringChecksService } = makeController();
			authoringChecksService.updateInstance.mockResolvedValue(null);

			await expect(
				controller.update(req, undefined, 'missing', { enabled: true } as never),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('delete', () => {
		it('returns success when the instance is deleted', async () => {
			const { controller, authoringChecksService } = makeController();
			authoringChecksService.deleteInstance.mockResolvedValue(true);

			expect(await controller.delete(req, undefined, 'i-1')).toEqual({ success: true });
		});

		it('throws NotFoundError when the instance is missing', async () => {
			const { controller, authoringChecksService } = makeController();
			authoringChecksService.deleteInstance.mockResolvedValue(false);

			await expect(controller.delete(req, undefined, 'missing')).rejects.toThrow(NotFoundError);
		});
	});
});
