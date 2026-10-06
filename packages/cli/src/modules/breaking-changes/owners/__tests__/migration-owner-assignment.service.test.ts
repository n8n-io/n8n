import type { User, UserRepository, WorkflowRepository } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
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
	let service: MigrationOwnerAssignmentService;

	beforeEach(() => {
		workflowRepository = mock<WorkflowRepository>();
		userRepository = mock<UserRepository>();
		ownerRepository = mock<MigrationWorkflowOwnerRepository>();
		suggestionService = mock<MigrationOwnerSuggestionService>();
		workflowRepository.findExistingIds.mockResolvedValue([WORKFLOW_ID]);
		userRepository.findManyByIds.mockResolvedValue([alice]);
		suggestionService.suggestOwners.mockResolvedValue([]);
		service = new MigrationOwnerAssignmentService(
			workflowRepository,
			userRepository,
			ownerRepository,
			suggestionService,
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

		it('rejects an unknown user before writing', async () => {
			userRepository.findManyByIds.mockResolvedValue([]);

			await expect(service.assign(WORKFLOW_ID, 'nobody', admin)).rejects.toBeInstanceOf(
				NotFoundError,
			);
			expect(ownerRepository.assign).not.toHaveBeenCalled();
		});
	});

	describe('unassign', () => {
		it('drops the owner, puts the suggestion back and returns it', async () => {
			suggestionService.suggestOwners.mockResolvedValue([
				{ workflowId: WORKFLOW_ID, userId: alice.id },
			]);

			const owner = await service.unassign(WORKFLOW_ID);

			expect(ownerRepository.removeOwner).toHaveBeenCalledWith(WORKFLOW_ID, expect.anything());
			expect(suggestionService.suggestOwners).toHaveBeenCalledWith([WORKFLOW_ID]);
			expect(ownerRepository.replaceSuggestions).toHaveBeenCalledWith(
				[WORKFLOW_ID],
				[{ workflowId: WORKFLOW_ID, userId: alice.id }],
				expect.anything(),
			);
			expect(owner).toMatchObject({ id: alice.id, source: 'suggested' });
		});

		it('returns no owner when the heuristic has no suggestion', async () => {
			const owner = await service.unassign(WORKFLOW_ID);

			expect(ownerRepository.replaceSuggestions).toHaveBeenCalledWith(
				[WORKFLOW_ID],
				[],
				expect.anything(),
			);
			expect(owner).toBeNull();
		});

		it('rejects an unknown workflow before writing', async () => {
			workflowRepository.findExistingIds.mockResolvedValue([]);

			await expect(service.unassign(WORKFLOW_ID)).rejects.toBeInstanceOf(NotFoundError);
			expect(ownerRepository.removeOwner).not.toHaveBeenCalled();
		});
	});
});
