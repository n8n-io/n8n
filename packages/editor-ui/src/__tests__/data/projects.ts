import { faker } from '@faker-js/faker';
import type {
	ProjectListItem,
	ProjectSharingData,
	ProjectType,
} from '@/features/projects/projects.types';
import { ProjectTypes } from '@/features/projects/projects.utils';

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
