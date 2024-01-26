import { Factory } from 'miragejs';
import type { ITag } from '@/Interface';
import { faker } from '@faker-js/faker';

export const tagFactory = Factory.extend<ITag>({
	id(i: string) {
		return i;
	},
	name() {
		return faker.lorem.word();
	},
});
