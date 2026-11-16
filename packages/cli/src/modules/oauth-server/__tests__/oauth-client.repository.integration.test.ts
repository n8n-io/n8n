import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { OAuthClient } from '../database/entities/oauth-client.entity';
import { UserConsent } from '../database/entities/oauth-user-consent.entity';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';

let clients: OAuthClientRepository;
let rows: Repository<OAuthClient>;
let consents: Repository<UserConsent>;
let transactionRunner: TransactionRunner;

const registration = (id: string) => ({
	id,
	name: 'Test client',
	redirectUris: ['https://example.com/callback'],
	grantTypes: ['authorization_code'],
	tokenEndpointAuthMethod: 'none',
	clientSecret: null,
	clientSecretExpiresAt: null,
	isFirstParty: false,
});

beforeAll(async () => {
	await testModules.loadModules(['oauth-server']);
	await testDb.init();
	clients = Container.get(OAuthClientRepository);
	rows = Container.get(DataSource).getRepository(OAuthClient);
	consents = Container.get(DataSource).getRepository(UserConsent);
	transactionRunner = Container.get(TransactionRunner);
});

afterEach(async () => {
	await testDb.truncate(['OAuthClient']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('registration rejects duplicate ids and keeps the original row', async () => {
	const client = registration('registered-client');
	await clients.registerClient(client, {});
	await expect(clients.registerClient({ ...client, name: 'Other name' }, {})).rejects.toThrow();
	expect(await clients.findById(client.id, {})).toMatchObject(client);
	expect(await clients.findById('missing-client', {})).toBeNull();
});

test('virtual client upserts update the row and stay outside the registered client list', async () => {
	const registered = registration('registered-client');
	const virtual = { ...registration('virtual-client'), isFirstParty: true };
	await clients.registerClient(registered, {});
	await clients.upsertVirtualClient(virtual, {});
	await clients.upsertVirtualClient({ ...virtual, name: 'Updated virtual client' }, {});

	expect(await rows.count()).toBe(2);
	expect(await clients.findById(virtual.id, {})).toMatchObject({
		...virtual,
		name: 'Updated virtual client',
	});
	expect(await clients.countRegistered({})).toBe(1);
	const names = await clients.findRegisteredNames({});
	expect(names).toEqual([{ id: registered.id, name: registered.name }]);
	expect(Object.keys(names[0]).sort()).toEqual(['id', 'name']);
});

test('registration removal deletes by id and accepts a missing row', async () => {
	await rows.save([registration('remove-client'), registration('keep-client')]);
	await clients.removeRegistration('remove-client', {});
	await expect(clients.removeRegistration('missing-client', {})).resolves.toBeUndefined();

	expect(await rows.findOneBy({ id: 'remove-client' })).toBeNull();
	expect(await rows.findOneBy({ id: 'keep-client' })).not.toBeNull();
});

test('conditional deletion keeps the client until the last consent is gone', async () => {
	const client = await rows.save(registration('shared-client'));
	const firstUser = await createUser();
	const secondUser = await createUser();
	await consents.save(
		[firstUser, secondUser].map((user) => ({
			userId: user.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: [],
		})),
	);

	expect(await clients.deleteIfUnused(client.id, {})).toBe(false);
	await consents.delete({ clientId: client.id, userId: firstUser.id });
	expect(await clients.deleteIfUnused(client.id, {})).toBe(false);
	expect(await rows.findOneBy({ id: client.id })).not.toBeNull();
	await consents.delete({ clientId: client.id, userId: secondUser.id });
	expect(await clients.deleteIfUnused(client.id, {})).toBe(true);
	expect(await rows.findOneBy({ id: client.id })).toBeNull();
	expect(await clients.deleteIfUnused(client.id, {})).toBe(false);
});

test('all methods use the supplied transaction context', async () => {
	const original = registration('original-client');
	await rows.save([original, registration('remove-client'), registration('unused-client')]);
	const rollback = new Error('Roll back test changes');

	await expect(
		transactionRunner.run({}, async (ctx) => {
			await clients.registerClient(registration('new-client'), ctx);
			await clients.upsertVirtualClient({ ...original, name: 'Updated name' }, ctx);
			expect(await clients.findById(original.id, ctx)).toMatchObject({ name: 'Updated name' });
			expect(await clients.countRegistered(ctx)).toBe(4);
			expect(await clients.findRegisteredNames(ctx)).toHaveLength(4);
			await clients.removeRegistration('remove-client', ctx);
			expect(await clients.deleteIfUnused('unused-client', ctx)).toBe(true);
			throw rollback;
		}),
	).rejects.toBe(rollback);

	expect(await rows.findOneBy({ id: original.id })).toMatchObject(original);
	expect(await rows.findOneBy({ id: 'new-client' })).toBeNull();
	expect(await rows.findOneBy({ id: 'remove-client' })).not.toBeNull();
	expect(await rows.findOneBy({ id: 'unused-client' })).not.toBeNull();
});
