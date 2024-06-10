import { faker } from '@faker-js/faker';
import type {
	Project,
	ProjectListItem,
	ProjectSharingData,
	ProjectType,
} from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';

export const createProjectSharingData = (projectType?: ProjectType): ProjectSharingData => ({
	id: faker.string.uuid(),
	name: faker.lorem.words({ min: 1, max: 3 }),
	type: projectType ?? ProjectTypes.Personal,
	createdAt: faker.date.past().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
});

export const createProjectListItem = (projectType?: ProjectType): ProjectListItem => {
	const project = createProjectSharingData(projectType);
	return {
		...project,
		role: 'project:editor',
		createdAt: faker.date.past().toISOString(),
		updatedAt: faker.date.recent().toISOString(),
	};
};

export function createTestProject(data: Partial<Project>): Project {
	return {
		id: faker.string.uuid(),
		name: faker.lorem.words({ min: 1, max: 3 }),
		createdAt: faker.date.past().toISOString(),
		updatedAt: faker.date.recent().toISOString(),
		type: 'team',
		relations: [],
		scopes: [],
		...data,
	};
}
