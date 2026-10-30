import { randomEmail, randomName } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DeepPartial } from '@n8n/typeorm';

export async function createUser(attributes: DeepPartial<User> = {}): Promise<User> {
	const repository = Container.get(UserRepository);
	const { user } = await repository.createUserWithProject(
		repository.create({
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
			role: GLOBAL_MEMBER_ROLE,
			...attributes,
		}),
	);
	return user;
}
