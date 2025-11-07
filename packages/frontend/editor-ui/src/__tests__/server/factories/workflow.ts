import { Factory } from 'miragejs';
import type { IWorkflowDb } from '@/Interface';
import { faker } from '@faker-js/faker';

export const workflowFactory = Factory.extend<IWorkflowDb>({
	id(i: number) {
		return i.toString();
	},
	versionId(i: number) {
		return i.toString();
	},
	active() {
		return faker.datatype.boolean();
	},
	isArchived() {
		return faker.datatype.boolean();
	},
	nodes() {
		return [];
	},
	connections() {
		return {};
	},
	name() {
		return faker.lorem.word();
	},
	createdAt() {
		return faker.date.recent().toISOString();
	},
	updatedAt() {
		return faker.date.recent().toISOString();
	},
	tags() {
		return faker.lorem.words(2.5).split(' ');
	},
});
