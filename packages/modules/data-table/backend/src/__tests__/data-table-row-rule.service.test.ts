import type {
	Project,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DataTableRowRuleService, hasTriggerWithoutUser } from '../data-table-row-rule.service';
import type { DataTableRepository } from '../data-table.repository';
import type { DataTableService } from '../data-table.service';

const node = (type: string, parameters: INode['parameters'] = {}, disabled = false) =>
	({ name: type, type, typeVersion: 1, position: [0, 0], parameters, disabled }) as INode;

describe('hasTriggerWithoutUser', () => {
	it('flags a schedule trigger', () => {
		expect(hasTriggerWithoutUser([node('n8n-nodes-base.scheduleTrigger')])).toBe(true);
	});

	it('flags a webhook without n8n user auth', () => {
		expect(hasTriggerWithoutUser([node('n8n-nodes-base.webhook')])).toBe(true);
	});

	it('accepts a webhook with n8n user auth', () => {
		expect(
			hasTriggerWithoutUser([node('n8n-nodes-base.webhook', { authentication: 'n8nOAuth2' })]),
		).toBe(false);
	});

	it('accepts a manual trigger and ignores a disabled schedule trigger', () => {
		expect(
			hasTriggerWithoutUser([
				node('n8n-nodes-base.manualTrigger'),
				node('n8n-nodes-base.scheduleTrigger', {}, true),
			]),
		).toBe(false);
	});
});

describe('DataTableRowRuleService.getImpact', () => {
	it('lists the published workflows whose trigger has no user', async () => {
		const dependencies = mock<WorkflowDependencyRepository>();
		const history = mock<WorkflowHistoryRepository>();
		const workflows = mock<WorkflowRepository>();
		const sharedWorkflows = mock<SharedWorkflowRepository>();
		const service = new DataTableRowRuleService(
			mock<DataTableService>(),
			mock<DataTableRepository>(),
			dependencies,
			history,
			workflows,
			sharedWorkflows,
		);
		dependencies.findDependenciesForResources.mockResolvedValue([
			{
				workflowId: 'wf-schedule',
				dependencyType: 'dataTableId',
				dependencyKey: 't1',
				publishedVersionId: 'v1',
			},
			{
				workflowId: 'wf-form',
				dependencyType: 'dataTableId',
				dependencyKey: 't1',
				publishedVersionId: 'v2',
			},
			{
				workflowId: 'wf-draft',
				dependencyType: 'dataTableId',
				dependencyKey: 't1',
				publishedVersionId: null,
			},
			{
				workflowId: 'wf-elsewhere',
				dependencyType: 'dataTableId',
				dependencyKey: 't1',
				publishedVersionId: 'v3',
			},
		]);
		history.findNodesByVersionIds.mockResolvedValue([
			{ versionId: 'v1', nodes: [node('n8n-nodes-base.scheduleTrigger')] },
			{ versionId: 'v2', nodes: [node('n8n-nodes-base.manualTrigger')] },
			{ versionId: 'v3', nodes: [node('n8n-nodes-base.scheduleTrigger')] },
		]);
		sharedWorkflows.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([
				['wf-schedule', { id: 'project-1' } as Project],
				['wf-elsewhere', { id: 'project-2' } as Project],
			]),
		);
		workflows.findByIds.mockResolvedValue([
			{ id: 'wf-schedule', name: 'Nightly sync' } as WorkflowEntity,
		]);

		const impact = await service.getImpact('t1', 'project-1');

		expect(history.findNodesByVersionIds).toHaveBeenCalledWith(['v1', 'v2', 'v3']);
		expect(workflows.findByIds).toHaveBeenCalledWith(['wf-schedule'], { fields: ['name'] });
		expect(impact).toEqual({ workflowsWithoutUser: [{ id: 'wf-schedule', name: 'Nightly sync' }] });
	});
});
