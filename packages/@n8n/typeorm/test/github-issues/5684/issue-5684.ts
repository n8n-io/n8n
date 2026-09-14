import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource, In } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Company } from './entity/Company';
import { User } from './entity/User';

describe('github issues > #5684 eager relation skips children relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User, Company],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should select children of an eager relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const company = new Company();
				company.name = 'company';
				await connection.getRepository(Company).save(company);

				const userAdmin = new User();
				userAdmin.name = 'admin';
				userAdmin.company = company;
				await connection.getRepository(User).save(userAdmin);

				const userNormal = new User();
				userNormal.name = 'normal';
				userNormal.company = company;
				await connection.getRepository(User).save(userNormal);

				company.admin = userAdmin;
				await connection.getRepository(Company).save(company);

				const assert = (user: User | undefined | null): void => {
					expect(user && user.company && user.company.admin).to.be.a.instanceOf(
						User,
						'loads nested relation of an eager relation',
					);
					expect(user && user.company && user.company.staff).to.have.length(
						2,
						'loads nested relation of an eager relation',
					);
					for (const member of (user && user.company.staff) || []) {
						expect(member).to.be.a.instanceOf(User, 'loads nested relation of an eager relation');
						expect(member.company).to.be.a.instanceOf(
							Company,
							'loads nested relation of an eager relation',
						);
						expect(member.company.admin).to.be.a.instanceOf(
							User,
							'loads nested relation of an eager relation',
						);
						expect(member.company.admin.company).to.be.a.instanceOf(
							Company,
							'still loads an eager relation',
						);
					}
				};

				const relations = {
					company: {
						admin: true,
						staff: {
							company: {
								admin: true,
							},
						},
					},
					// "company.admin", // <-- can't be loaded without the fix.
					// "company.staff", // <-- can't be loaded without the fix.
					// "company.staff.company", // <-- can't be loaded without the fix.
					// "company.staff.company.admin", // <-- can't be loaded without the fix.
				};

				const user1 = await connection.getRepository(User).findOne({
					where: { id: userAdmin.id },
					relations: relations,
				});
				assert(user1);
				const user2 = await connection.getRepository(User).findOneOrFail({
					where: { id: userAdmin.id },
					relations: relations,
				});
				assert(user2);
				const users3 = await connection.getRepository(User).find({
					where: {
						id: userAdmin.id,
					},
					relations: relations,
				});
				assert(users3.pop());
				const [users4] = await connection.getRepository(User).findAndCount({
					where: {
						id: userAdmin.id,
					},
					relations: relations,
				});
				assert(users4.pop());
				const users5 = await connection.getRepository(User).find({
					where: {
						id: In([userAdmin.id]),
					},
					relations: relations,
				});
				assert(users5.pop());
			}),
		));
});
