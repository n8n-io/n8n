import type { ProjectRole } from '@n8n/api-types';
import { Container } from '@n8n/di';

import type { Project } from '@/databases/entities/project';
import type { ProjectRelation } from '@/databases/entities/project-relation';
import type { User } from '@/databases/entities/user';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';

import { randomName } from '../random';

export const createTeamProject = async (name?: string, adminUser?: User) => {
	const projectRepository = Container.get(ProjectRepository);
	const project = await projectRepository.save(
		projectRepository.create({
			name: name ?? randomName(),
			type: 'team',
		}),
	);

	if (adminUser) {
		await linkUserToProject(adminUser, project, 'project:admin');
	}

	return project;
};

export const linkUserToProject = async (user: User, project: Project, role: ProjectRole) => {
	const projectRelationRepository = Container.get(ProjectRelationRepository);
	await projectRelationRepository.save(
		projectRelationRepository.create({
			projectId: project.id,
			userId: user.id,
			role,
		}),
	);
};

export async function getProjectByNameOrFail(name: string) {
	return await Container.get(ProjectRepository).findOneOrFail({ where: { name } });
}

export const getPersonalProject = async (user: User): Promise<Project> => {
	return await Container.get(ProjectRepository).findOneOrFail({
		where: {
			projectRelations: {
				userId: user.id,
				role: 'project:personalOwner',
			},
			type: 'personal',
		},
	});
};

export const findProject = async (id: string): Promise<Project> => {
	return await Container.get(ProjectRepository).findOneOrFail({
		where: { id },
	});
};

export const getProjectRelations = async ({
	projectId,
	userId,
	role,
}: Partial<ProjectRelation>): Promise<ProjectRelation[]> => {
	return await Container.get(ProjectRelationRepository).find({
		where: { projectId, userId, role },
	});
};
