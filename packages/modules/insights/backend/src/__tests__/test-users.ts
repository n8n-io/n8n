import { randomEmail, randomName } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

export async function createMember() {
	const { user } = await Container.get(UserRepository).createUserWithProject({
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: null,
		role: GLOBAL_MEMBER_ROLE,
	});

	return user;
}
