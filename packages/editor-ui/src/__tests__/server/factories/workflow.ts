import { Factory } from 'miragejs';
import type { IWorkflowDb } from '@/Interface';
import { faker } from '@faker-js/faker';

export const workflowFactory = Factory.extend<IWorkflowDb>({
	id(i: string) {
		return i;
	},
	name() {
		return faker.lorem.word();
	},
	createdAt() {
		return faker.date.recent().toISOString();
	},
});
