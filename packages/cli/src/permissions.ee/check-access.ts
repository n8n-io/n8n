import type { User } from '@n8n/db';
import { CredentialsRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * Check if a user has the required scopes. The check can be:
 *
 * - only for scopes in the user's global role, or
 * - for scopes in the user's global role, else for scopes in the resource roles
 *   of projects including the user and the resource, else for scopes in the
 *   project roles in those projects.
 */
export async function userHasScopes(
	user: User,
	scopes: Scope[],
	globalOnly: boolean,
	{
		credentialId,
		workflowId,
		projectId,
	}: { credentialId?: string; workflowId?: string; projectId?: string } /* only one */,
): Promise<boolean> {
	if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return true;

	if (globalOnly) return false;

	// Find which projects the user has access to with the required scopes.
	// This is done by finding the projects where the user has a role with at least the required scopes
	const userProjectIds = (
		await Container.get(ProjectRepository)
			.createQueryBuilder('project')
			.innerJoin('project.projectRelations', 'relation')
			.innerJoin('relation.role', 'role')
			.innerJoin('role.scopes', 'scope')
			.where('relation.userId = :userId', { userId: user.id })
			.andWhere('scope.slug IN (:...scopes)', { scopes })
			.groupBy('project.id')
			.having('COUNT(DISTINCT scope.slug) = :scopeCount', { scopeCount: scopes.length })
			.select(['project.id AS id'])
			.getRawMany()
	).map((row: { id: string }) => row.id);

	// Check if the user has access through the project
	if (credentialId) {
		const credential = await Container.get(CredentialsRepository).findOne({
			where: { id: credentialId },
			select: ['id', 'projectId'],
		});

		if (!credential) {
			throw new NotFoundError(`Credential with ID "${credentialId}" not found.`);
		}

		return userProjectIds.includes(credential.projectId);
	}

	if (workflowId) {
		const workflow = await Container.get(WorkflowRepository).findOne({
			where: { id: workflowId },
			select: ['id', 'projectId'],
		});

		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found.`);
		}

		return userProjectIds.includes(workflow.projectId);
	}

	if (projectId) return userProjectIds.includes(projectId);

	throw new UnexpectedError(
		"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
	);
}
