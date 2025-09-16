import { Factory } from 'miragejs';
import type { Tag } from '@n8n/api-types';
import { faker } from '@faker-js/faker';

export const tagFactory = Factory.extend<Tag>({
	id(i: number) {
		return i.toString();
	},
	name() {
		return faker.lorem.word();
	},
});
