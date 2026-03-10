import { mockLogger } from '@n8n/backend-test-utils';
import type {
	WorkflowPublishedVersionRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedVersion,
	WorkflowHistory,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode, IConnections } from 'n8n-workflow';

import { WorkflowPublishedVersionService } from '@/workflows/workflow-published-version.service';

describe('WorkflowPublishedVersionService', () => {
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();

	const service = new WorkflowPublishedVersionService(
		mockLogger(),
		workflowPublishedVersionRepository,
		workflowHistoryRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getPublishedVersion', () => {
		const workflowId = 'workflow-1';
		const publishedVersionId = 'version-1';

		const nodes: INode[] = [
			{
				id: 'node-1',
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		const connections: IConnections = {};

		it('should return published version data when it exists', async () => {
			workflowPublishedVersionRepository.getPublishedVersionId.mockResolvedValue(
				publishedVersionId,
			);
			workflowHistoryRepository.findOne.mockResolvedValue(
				mock<WorkflowHistory>({
					versionId: publishedVersionId,
					nodes,
					connections,
				}),
			);

			const result = await service.getPublishedVersion(workflowId);

			expect(result).toEqual({ versionId: publishedVersionId, nodes, connections });
			expect(workflowPublishedVersionRepository.getPublishedVersionId).toHaveBeenCalledWith(
				workflowId,
			);
			expect(workflowHistoryRepository.findOne).toHaveBeenCalledWith({
				where: { versionId: publishedVersionId, workflowId },
				select: ['versionId', 'nodes', 'connections'],
			});
		});

		it('should return null when no published version record exists', async () => {
			workflowPublishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);

			const result = await service.getPublishedVersion(workflowId);

			expect(result).toBeNull();
			expect(workflowHistoryRepository.findOne).not.toHaveBeenCalled();
		});

		it('should return null when history entry is missing', async () => {
			workflowPublishedVersionRepository.getPublishedVersionId.mockResolvedValue(
				publishedVersionId,
			);
			workflowHistoryRepository.findOne.mockResolvedValue(null);

			const result = await service.getPublishedVersion(workflowId);

			expect(result).toBeNull();
		});
	});
});
