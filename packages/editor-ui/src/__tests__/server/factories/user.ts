import { Factory } from 'miragejs';
import { faker } from '@faker-js/faker';
import { SignInType } from '@/constants';
import type { IUser } from '@/Interface';

export const userFactory = Factory.extend<IUser>({
	id(i: number) {
		return `${i}`;
	},
	firstName() {
		return faker.name.firstName();
	},
	lastName() {
		return faker.name.lastName();
	},
	isDefaultUser() {
		return false;
	},
	isOwner() {
		return false;
	},
	isPending() {
		return false;
	},
	isPendingUser() {
		return false;
	},
	signInType(): SignInType {
		return SignInType.EMAIL;
	},
});
