import Container from 'typedi';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { generateNanoId } from '@/databases/utils/generators';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';

export async function createTeamProject(projectName: string) {
	return await Container.get(ProjectRepository).save({
		id: generateNanoId(),
		name: projectName,
		type: 'team',
	});
}

export async function addUserToProject(userId: string, projectId: string, role: ProjectRole) {
	return await Container.get(ProjectRelationRepository).insert({ userId, projectId, role });
}
