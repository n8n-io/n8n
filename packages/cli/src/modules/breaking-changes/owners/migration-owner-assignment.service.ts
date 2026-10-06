import type { BreakingChangeWorkflowOwner } from '@n8n/api-types';
import { UserRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { MigrationWorkflowOwnerRepository } from '../database/repositories/migration-workflow-owner.repository';
import { MigrationOwnerSuggestionService } from './migration-owner-suggestion.service';
import { toWorkflowOwner } from './workflow-owner';

/** Lets a person choose who owns a workflow's findings, or hand it back to the heuristic. */
@Service()
export class MigrationOwnerAssignmentService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly ownerRepository: MigrationWorkflowOwnerRepository,
		private readonly suggestionService: MigrationOwnerSuggestionService,
	) {}

	async assign(
		workflowId: string,
		userId: string,
		assignedBy: User,
	): Promise<BreakingChangeWorkflowOwner> {
		await this.ensureWorkflowExists(workflowId);
		const user = await this.findUser(userId);
		if (!user) throw new NotFoundError(`User with ID '${userId}' not found.`);

		await this.ownerRepository.assign(workflowId, userId, assignedBy.id, {});
		return toWorkflowOwner(user, 'assigned');
	}

	/**
	 * Drops the assignment and puts the heuristic's suggestion back, so the
	 * workflow does not sit without an owner until the next sync.
	 */
	async unassign(workflowId: string): Promise<BreakingChangeWorkflowOwner | null> {
		await this.ensureWorkflowExists(workflowId);

		await this.ownerRepository.removeOwner(workflowId, {});
		const suggestions = await this.suggestionService.suggestOwners([workflowId]);
		await this.ownerRepository.replaceSuggestions([workflowId], suggestions, {});

		const suggestion = suggestions.find((candidate) => candidate.workflowId === workflowId);
		const user = suggestion ? await this.findUser(suggestion.userId) : undefined;
		return user ? toWorkflowOwner(user, 'suggested') : null;
	}

	private async ensureWorkflowExists(workflowId: string): Promise<void> {
		const existing = await this.workflowRepository.findExistingIds([workflowId], {});
		if (existing.length === 0) {
			throw new NotFoundError(`Workflow with ID '${workflowId}' not found.`);
		}
	}

	private async findUser(userId: string): Promise<User | undefined> {
		const [user] = await this.userRepository.findManyByIds([userId]);
		return user;
	}
}
