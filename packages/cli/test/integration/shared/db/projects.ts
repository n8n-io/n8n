import Container from 'typedi';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import type { DeepPartial } from 'ts-essentials';
import type { Project } from '@/databases/entities/Project';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { User } from '@/databases/entities/User';

export async function createProject(user: User, project?: DeepPartial<Project>) {
	const projectRepository = Container.get(ProjectRepository);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	const savedProject = await projectRepository.save(
		projectRepository.create({
			name: 'project name',
			type: 'team',
			...project,
		}),
	);
	await projectRelationRepository.save(
		projectRelationRepository.create({
			userId: user.id,
			projectId: savedProject.id,
			role: 'project:personalOwner',
		}),
	);

	return savedProject;
}
