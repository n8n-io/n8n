import { faker } from '@faker-js/faker';
import type { IUser } from '@/Interface';
import { SignInType } from '@/constants';

export const createUser = (overrides?: Partial<IUser>): IUser => ({
	id: faker.string.uuid(),
	email: faker.internet.email(),
	firstName: faker.person.firstName(),
	lastName: faker.person.lastName(),
	isDefaultUser: false,
	isPending: false,
	isPendingUser: false,
	mfaEnabled: false,
	signInType: SignInType.EMAIL,
	...overrides,
});
