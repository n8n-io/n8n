import { Factory } from 'miragejs';
import { faker } from '@faker-js/faker';
import type { ICredentialsResponse } from '@/Interface';

export const credentialFactory = Factory.extend<ICredentialsResponse>({
	id(i: number) {
		return `${i}`;
	},
	createdAt() {
		return faker.date.recent().toISOString();
	},
	name() {
		return faker.company.name();
	},
	type() {
		return 'notionApi';
	},
	updatedAt() {
		return '';
	},
	isManaged() {
		return false;
	},
});
