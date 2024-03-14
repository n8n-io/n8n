import Container from 'typedi';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { User } from '@/databases/entities/User';

export async function createProject(user: User) {
	const projectRepository = Container.get(ProjectRepository);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	const savedProject = await projectRepository.save(
		projectRepository.create({
			name: 'project name',
			type: 'team',
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
