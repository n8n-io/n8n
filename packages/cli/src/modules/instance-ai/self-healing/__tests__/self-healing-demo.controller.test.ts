import { SharedWorkflowRepository, type User, type Project } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { getRouteCases } from '@test/controller-route-metadata';

import { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';
import type { SelfHealingInvestigation } from '../database/self-healing-investigation.entity';
import { SelfHealingDemoController } from '../self-healing-demo.controller';
import { SelfHealingInvestigationService } from '../self-healing-investigation.service';

vi.mock('../../workflow-suggestions/workflow-suggestion.service', () => ({
	WorkflowSuggestionService: vi.fn(),
}));
vi.mock('../self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));

describe('SelfHealingDemoController', () => {
	const producer = mock<SelfHealingInvestigationService>();
	const investigations = mock<SelfHealingInvestigationRepository>();
	const suggestions = mock<WorkflowSuggestionService>();
	const ownership = mock<SharedWorkflowRepository>();
	const controller = new SelfHealingDemoController(
		producer,
		investigations,
		suggestions,
		ownership,
	);
	const request = {
		params: { projectId: 'project', workflowId: 'workflow', investigationId: 'investigation' },
		user: { id: 'user' },
		body: { executionId: '123', backgroundUserId: 'another-user' },
	} as Parameters<typeof controller.start>[0];

	beforeEach(() => {
		vi.resetAllMocks();
		suggestions.requireEditor.mockResolvedValue(mock<User>({ id: 'user' }));
		ownership.getWorkflowOwningProject.mockResolvedValue(mock<Project>({ id: 'project' }));
		investigations.get.mockResolvedValue(
			mock<SelfHealingInvestigation>({
				id: 'investigation',
				projectId: 'project',
				workflowId: 'workflow',
				finishedAt: null,
				resultId: null,
			}),
		);
	});

	it.each(getRouteCases(SelfHealingDemoController))(
		'$handlerName requires a signed-in workflow editor',
		({ route }) => {
			expect(route.skipAuth).toBe(false);
			expect(route.accessScope).toEqual({ scope: 'workflow:update', globalOnly: false });
		},
	);

	it('starts as the signed-in user', async () => {
		await controller.start(request);
		expect(producer.start).toHaveBeenCalledWith({
			workflowId: 'workflow',
			projectId: 'project',
			executionId: '123',
			backgroundUserId: 'user',
		});
	});

	it('rejects an invalid execution reference before starting a run', async () => {
		await expect(controller.start({ ...request, body: { executionId: '' } })).rejects.toThrow(
			'A failed execution ID is required.',
		);
		expect(producer.start).not.toHaveBeenCalled();
	});

	it('returns only the progress and result reference', async () => {
		await expect(controller.status(request)).resolves.toEqual({
			id: 'investigation',
			finishedAt: null,
			resultId: null,
		});
	});

	it('rechecks workflow access before reading progress', async () => {
		suggestions.requireEditor.mockRejectedValue(new Error('Access denied'));
		await expect(controller.status(request)).rejects.toThrow('Access denied');
		expect(investigations.get).not.toHaveBeenCalled();
	});

	it('rejects a workflow moved to another project', async () => {
		ownership.getWorkflowOwningProject.mockResolvedValue(mock<Project>({ id: 'another-project' }));
		await expect(controller.status(request)).rejects.toThrow('Workflow not found in this project.');
		expect(investigations.get).not.toHaveBeenCalled();
	});

	it.each(['workflowId', 'projectId'] as const)(
		'rejects an investigation with another %s',
		async (field) => {
			investigations.get.mockResolvedValue(
				mock<SelfHealingInvestigation>({
					projectId: 'project',
					workflowId: 'workflow',
					[field]: 'another',
				}),
			);
			await expect(controller.status(request)).rejects.toThrow(
				'Investigation not found in this workflow.',
			);
		},
	);
});
