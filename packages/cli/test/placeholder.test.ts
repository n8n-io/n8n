import { createConnection, getConnection, getRepository } from "typeorm";
import { Db } from "../src";
import { entities } from "../src/databases/entities";
import { Role } from "../src/databases/entities/Role";
import { User } from "../src/databases/entities/User";
import { sqliteMigrations } from "../src/databases/sqlite/migrations";
import * as request from 'supertest';
import * as app from '../src/Server';

// describe('Placeholder', () => {
// 	test('example', () => {
// 		expect(1 + 1).toEqual(2);
// 	});
// });

const TEST_USER_EMAIL = 'test@n8n.io';

describe('', () => {
	beforeEach(async () => {
		const connection = await createConnection({
			type: 'sqlite',
			database: ':memory:',
			migrations: sqliteMigrations,
			entities: Object.values(entities),
			dropSchema: true,
			migrationsRun: false,
			logging: false,
		});

		await connection.runMigrations({
			transaction: 'none',
		});
	});

	afterEach(() => {
		const connection = getConnection();
		return connection.close();
	});

	// test('store user and fetch it', async () => {
	// 	const role = await getRepository(Role).findOne({ scope: 'global', name: 'member' });
	// 	await getRepository(User).save({ email: TEST_USER_EMAIL, globalRole: role });

	// 	const fetchedUser = await getRepository(User).findOneOrFail({
	// 		where: { email: TEST_USER_EMAIL },
	// 	});

	// 	console.log(fetchedUser);

	// 	expect(fetchedUser.email).toBe(TEST_USER_EMAIL);
	// 	expect(fetchedUser.id).toBeDefined();
	// });

	// test('test using supertest', async () => {
	// 	request(app)
	// 		.get('/me')
	// 		.expect('Content-Type', /json/)
	// 		.expect(200)
	// 		.end();
	// });
});
