import {
	BulkArchiveWorkflowsDto,
	BulkDeleteWorkflowsDto,
	BulkTransferWorkflowsDto,
	BulkUnpublishWorkflowsDto,
} from '../bulk-workflow-action.dto';

const idDtos = [BulkArchiveWorkflowsDto, BulkDeleteWorkflowsDto, BulkUnpublishWorkflowsDto];

describe('bulk workflow action DTOs', () => {
	it.each(idDtos)('accepts between 1 and 100 workflow IDs', (Dto) => {
		expect(Dto.safeParse({ workflowIds: ['workflow-1'] }).success).toBe(true);
		expect(
			Dto.safeParse({ workflowIds: Array.from({ length: 100 }, (_, index) => `${index}`) }).success,
		).toBe(true);
	});

	it.each(idDtos)('rejects missing, empty, and oversized workflow ID lists', (Dto) => {
		expect(Dto.safeParse({}).success).toBe(false);
		expect(Dto.safeParse({ workflowIds: [] }).success).toBe(false);
		expect(Dto.safeParse({ workflowIds: [''] }).success).toBe(false);
		expect(
			Dto.safeParse({ workflowIds: Array.from({ length: 101 }, (_, index) => `${index}`) }).success,
		).toBe(false);
	});

	it('validates bulk transfer fields', () => {
		expect(
			BulkTransferWorkflowsDto.safeParse({
				workflowIds: ['workflow-1'],
				destinationProjectId: 'project-1',
				destinationParentFolderId: 'folder-1',
				shareCredentials: ['credential-1'],
			}).success,
		).toBe(true);
		expect(
			BulkTransferWorkflowsDto.safeParse({
				workflowIds: ['workflow-1'],
				destinationProjectId: '',
			}).success,
		).toBe(false);
	});
});
