import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import { AssistantArtifactNamesService } from '../assistant-artifact-names.service';

describe('AssistantArtifactNamesService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const service = new AssistantArtifactNamesService(workflowRepository, dataTableRepository);

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepository.findByIds.mockResolvedValue([]);
		dataTableRepository.findSummariesByIds.mockResolvedValue([]);
	});

	it('uses the current name of a workflow', async () => {
		workflowRepository.findByIds.mockResolvedValue([mock<WorkflowEntity>({ name: 'Renamed' })]);

		await expect(
			service.withCurrentName({ type: 'workflow', id: 'wf-1', name: 'Sync' }),
		).resolves.toEqual({ type: 'workflow', id: 'wf-1', name: 'Renamed' });
	});

	it('uses the current name and project of a data table', async () => {
		dataTableRepository.findSummariesByIds.mockResolvedValue([
			{ id: 'dt-1', name: 'Leads', projectId: 'project-1' },
		]);

		await expect(service.withCurrentName({ type: 'data-table', id: 'dt-1' })).resolves.toEqual({
			type: 'data-table',
			id: 'dt-1',
			name: 'Leads',
			projectId: 'project-1',
		});
	});

	it('keeps the artifact when the resource is not found', async () => {
		const artifact = { type: 'workflow' as const, id: 'wf-1', name: 'Sync' };

		await expect(service.withCurrentName(artifact)).resolves.toEqual(artifact);
	});
});
