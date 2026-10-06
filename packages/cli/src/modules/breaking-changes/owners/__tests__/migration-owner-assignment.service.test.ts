import type { WorkflowSharingService } from '@n8n/backend-services';
import type { User, UserRepository, WorkflowRepository } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { MigrationWorkflowOwnerRepository } from '../../database/repositories/migration-workflow-owner.repository';
import { MigrationOwnerAssignmentService } from '../migration-owner-assignment.service';
import type { MigrationOwnerSuggestionService } from '../migration-owner-suggestion.service';

const WORKFLOW_ID = 'wf-1';
const admin = { id: 'admin-1' } as User;
const alice = {
	id: 'alice',
	firstName: 'Alice',
	lastName: 'A',
	email: 'alice@example.com',
} as User;

describe('MigrationOwnerAssignmentService', () => {
	let workflowRepository: MockProxy<WorkflowRepository>;
	let userRepository: MockProxy<UserRepository>;
	let ownerRepository: MockProxy<MigrationWorkflowOwnerRepository>;
	let suggestionService: MockProxy<MigrationOwnerSuggestionService>;
	let workflowSharingService: MockProxy<WorkflowSharingService>;
	let service: MigrationOwnerAssignmentService;

	beforeEach(() => {
		workflowRepository = mock<WorkflowRepository>();
		userRepository = mock<UserRepository>();
		ownerRepository = mock<MigrationWorkflowOwnerRepository>();
		suggestionService = mock<MigrationOwnerSuggestionService>();
		workflowSharingService = mock<WorkflowSharingService>();
		workflowRepository.findExistingIds.mockResolvedValue([WORKFLOW_ID]);
		userRepository.findManyByIds.mockResolvedValue([alice]);
		suggestionService.suggestOwners.mockResolvedValue([]);
		workflowSharingService.getUserIdsWithAccessToWorkflow.mockResolvedValue([alice.id]);
		service = new MigrationOwnerAssignmentService(
			workflowRepository,
			userRepository,
			ownerRepository,
			suggestionService,
			workflowSharingService,
		);
	});

	describe('assign', () => {
		it('stores the chosen user as the assigned owner and returns the owner', async () => {
			const owner = await service.assign(WORKFLOW_ID, alice.id, admin);

			expect(ownerRepository.assign).toHaveBeenCalledWith(
				WORKFLOW_ID,
				alice.id,
				admin.id,
				expect.anything(),
			);
			expect(owner).toEqual({
				id: alice.id,
				firstName: 'Alice',
				lastName: 'A',
				email: 'alice@example.com',
				source: 'assigned',
			});
		});

		it('rejects an unknown workflow before writing', async () => {
			workflowRepository.findExistingIds.mockResolvedValue([]);

			await expect(service.assign(WORKFLOW_ID, alice.id, admin)).rejects.toBeInstanceOf(
				NotFoundError,
			);
			expect(ownerRepository.assign).not.toHaveBeenCalled();
		});

		it('rejects a user who cannot access the workflow before writing', async () => {
			workflowSharingService.getUserIdsWithAccessToWorkflow.mockResolvedValue(['someone-else']);

			await expect(service.assign(WORKFLOW_ID, alice.id, admin)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(ownerRepository.assign).not.toHaveBeenCalled();
		});

		it('rejects an unknown user before writing', async () => {
			userRepository.findManyByIds.mockResolvedValue([]);

			await expect(service.assign(WORKFLOW_ID, 'nobody', admin)).rejects.toBeInstanceOf(
				NotFoundError,
			);
			expect(ownerRepository.assign).not.toHaveBeenCalled();
		});
	});

	describe('unassign', () => {
		it('replaces the owner with the suggestion in one step and returns it', async () => {
			suggestionService.suggestOwners.mockResolvedValue([
				{ workflowId: WORKFLOW_ID, userId: alice.id },
			]);

			const owner = await service.unassign(WORKFLOW_ID);

			expect(suggestionService.suggestOwners).toHaveBeenCalledWith([WORKFLOW_ID]);
			expect(ownerRepository.resetToSuggestion).toHaveBeenCalledWith(
				WORKFLOW_ID,
				alice.id,
				expect.anything(),
			);
			expect(owner).toMatchObject({ id: alice.id, source: 'suggested' });
		});

		it('leaves the workflow without an owner when the heuristic has no suggestion', async () => {
			const owner = await service.unassign(WORKFLOW_ID);

			expect(ownerRepository.resetToSuggestion).toHaveBeenCalledWith(
				WORKFLOW_ID,
				undefined,
				expect.anything(),
			);
			expect(owner).toBeNull();
		});

		it('keeps the assignment when the heuristic fails', async () => {
			suggestionService.suggestOwners.mockRejectedValue(new Error('activity log unavailable'));

			await expect(service.unassign(WORKFLOW_ID)).rejects.toThrow('activity log unavailable');
			expect(ownerRepository.resetToSuggestion).not.toHaveBeenCalled();
		});

		it('rejects an unknown workflow before writing', async () => {
			workflowRepository.findExistingIds.mockResolvedValue([]);

			await expect(service.unassign(WORKFLOW_ID)).rejects.toBeInstanceOf(NotFoundError);
			expect(ownerRepository.resetToSuggestion).not.toHaveBeenCalled();
		});
	});
});
