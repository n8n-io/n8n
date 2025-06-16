import type { User } from '@n8n/db';
import { ProjectRepository, SharedCredentialsRepository, SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, rolesWithScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
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

	// Find which project roles are defined to contain the required scopes.
	// Then find projects having this user and having those project roles.

	const projectRoles = rolesWithScope('project', scopes);
	const userProjectIds = (
		await Container.get(ProjectRepository).find({
			where: {
				projectRelations: {
					userId: user.id,
					role: In(projectRoles),
				},
			},
			select: ['id'],
		})
	).map((p) => p.id);

	// Find which resource roles are defined to contain the required scopes.
	// Then find at least one of the above qualifying projects having one of
	// those resource roles over the resource being checked.

	if (credentialId) {
		const credentials = await Container.get(SharedCredentialsRepository).findBy({
			credentialsId: credentialId,
		});
		if (!credentials.length) {
			throw new NotFoundError(`Credential with ID "${credentialId}" not found.`);
		}

		return credentials.some(
			(c) =>
				userProjectIds.includes(c.projectId) &&
				rolesWithScope('credential', scopes).includes(c.role),
		);
	}

	if (workflowId) {
		const workflows = await Container.get(SharedWorkflowRepository).findBy({
			workflowId,
		});

		if (!workflows.length) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found.`);
		}

		return workflows.some(
			(w) =>
				userProjectIds.includes(w.projectId) && rolesWithScope('workflow', scopes).includes(w.role),
		);
	}

	if (projectId) return userProjectIds.includes(projectId);

	throw new UnexpectedError(
		"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
	);
}
