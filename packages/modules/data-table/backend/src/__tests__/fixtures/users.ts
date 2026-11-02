import { randomEmail, randomName } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, UserRepository, type Person } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DeepPartial } from '@n8n/typeorm';

export async function createUser(attributes: DeepPartial<Person> = {}): Promise<Person> {
	const { user } = await Container.get(UserRepository).createUserWithProject({
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		role: GLOBAL_MEMBER_ROLE,
		...attributes,
	});
	return user;
}
