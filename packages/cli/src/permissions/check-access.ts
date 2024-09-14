import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { ApplicationError } from 'n8n-workflow';
import { Container } from 'typedi';

import type { User } from '@/databases/entities/user';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { RoleService } from '@/services/role.service';

export const userHasScope = async (
	user: User,
	scopes: Scope[],
	globalOnly: boolean,
	{
		credentialId,
		workflowId,
		projectId,
	}: { credentialId?: string; workflowId?: string; projectId?: string },
): Promise<boolean> => {
	// Short circuit here since a global role will always have access
	if (user.hasGlobalScope(scopes, { mode: 'allOf' })) {
		return true;
	} else if (globalOnly) {
		// The above check already failed so the user doesn't have access
		return false;
	}

	const roleService = Container.get(RoleService);
	const projectRoles = roleService.rolesWithScope('project', scopes);
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

	if (credentialId) {
		const exists = await Container.get(SharedCredentialsRepository).find({
			where: {
				projectId: In(userProjectIds),
				credentialsId: credentialId,
				role: In(roleService.rolesWithScope('credential', scopes)),
			},
		});

		if (!exists.length) {
			return false;
		}

		return true;
	}

	if (workflowId) {
		const exists = await Container.get(SharedWorkflowRepository).find({
			where: {
				projectId: In(userProjectIds),
				workflowId,
				role: In(roleService.rolesWithScope('workflow', scopes)),
			},
		});

		if (!exists.length) {
			return false;
		}

		return true;
	}

	if (projectId) {
		if (!userProjectIds.includes(projectId)) {
			return false;
		}

		return true;
	}

	throw new ApplicationError(
		"@ProjectScope decorator was used but does not have a credentialId, workflowId, or projectId in it's URL parameters. This is likely an implementation error. If you're a developer, please check you're URL is correct or that this should be using @GlobalScope.",
	);
};
