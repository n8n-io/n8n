import { Factory } from 'miragejs';
import { faker } from '@faker-js/faker';
import type { EnvironmentVariable } from '@/Interface';

export const variableFactory = Factory.extend<EnvironmentVariable>({
	id(i: number) {
		return i;
	},
	key() {
		return `${faker.lorem.word()}`.toUpperCase();
	},
	value() {
		return faker.internet.password(10);
	},
});
