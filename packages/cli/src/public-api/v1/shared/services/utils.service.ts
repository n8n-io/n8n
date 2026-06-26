import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';

export async function assertProjectScope(
	user: User,
	projectId: string,
	scopes: Scope[],
): Promise<void> {
	const exists = await Container.get(ProjectRepository).findOneBy({ id: projectId });
	if (!exists) {
		throw new NotFoundError(`Project with ID "${projectId}" not found`);
	}

	const project = await Container.get(ProjectService).getProjectWithScope(user, projectId, scopes);
	if (!project) throw new ForbiddenError();
}
