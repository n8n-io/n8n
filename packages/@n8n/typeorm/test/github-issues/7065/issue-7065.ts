import 'reflect-metadata';
import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import { Contact, Email, Phone, User } from './entity';

// TODO:
//  this test doesn't work with relationLoadStrategy: "query" enabled, because there is a bug with RelationMetadata.
//  Due to how relations work (in this test we have one relation with a single target to "user" from Email or Phone)
//  it leads to a single relation inside RelationMetadata with a single target (Email or Phone), and leads to further issues.
//  to fix this bug we need to re-write current implementation which is hard to do at this moment.

describe('github issues > #7065 ChildEntity type relationship produces unexpected results', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Contact, Email, Phone, User],
				schemaCreate: true,
				dropSchema: true,
				relationLoadStrategy: 'join', // TODO: fix it later
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should join child entity with discriminator value condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepo = connection.getRepository(User);

				const email = new Email();
				email.value = 'email';

				const phone = new Phone();
				phone.value = 'phone';

				const user = new User();
				user.name = 'Mike';
				user.emails = [email];
				user.phones = [phone];
				await userRepo.save(user);

				const result = await userRepo.findOne({
					where: {
						id: 1,
					},
					relations: { emails: true, phones: true },
				});

				expect(result!.emails.length).eq(1);
				expect(result!.emails[0].value).eq('email');
				expect(result!.phones.length).eq(1);
				expect(result!.phones[0].value).eq('phone');
			}),
		));
});
