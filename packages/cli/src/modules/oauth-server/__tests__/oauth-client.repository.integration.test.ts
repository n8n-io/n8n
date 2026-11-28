import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { AccessToken } from '../database/entities/oauth-access-token.entity';
import { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import { OAuthClient } from '../database/entities/oauth-client.entity';
import { RefreshToken } from '../database/entities/oauth-refresh-token.entity';
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

test('virtual client removal deletes the grants of virtual clients only', async () => {
	const user = await createUser();
	const virtual = {
		...registration('https://sales.apps.example.com/callback'),
		isFirstParty: true,
	};
	const kept = { ...registration('https://support.apps.example.com/callback'), isFirstParty: true };
	const registered = registration('https://registered.example.com/callback');
	await rows.save([virtual, kept, registered]);
	const dataSource = Container.get(DataSource);
	for (const { id: clientId } of [virtual, kept, registered]) {
		const grant = { clientId, userId: user.id };
		await consents.save({ ...grant, grantedAt: Date.now(), scope: [] });
		await dataSource.getRepository(AccessToken).save({ ...grant, token: `access-${clientId}` });
		await dataSource.getRepository(RefreshToken).save({
			...grant,
			token: `refresh-${clientId}`,
			expiresAt: Date.now() + 60_000,
			scope: [],
			resource: clientId,
		});
		await dataSource.getRepository(AuthorizationCode).save({
			...grant,
			code: `code-${clientId}`,
			redirectUri: clientId,
			codeChallenge: 'challenge',
			codeChallengeMethod: 'S256',
			state: null,
			resource: clientId,
			scope: [],
			expiresAt: Date.now() + 60_000,
		});
	}

	expect(
		await clients.removeVirtualClients([virtual.id, registered.id, 'missing-client'], {}),
	).toBe(1);
	expect(await clients.removeVirtualClients([], {})).toBe(0);

	expect(await rows.findOneBy({ id: virtual.id })).toBeNull();
	for (const entity of [UserConsent, AccessToken, RefreshToken, AuthorizationCode]) {
		const remaining = await dataSource.getRepository(entity).find({ select: { clientId: true } });
		expect(remaining.map(({ clientId }) => clientId).sort()).toEqual(
			[registered.id, kept.id].sort(),
		);
	}
});

test('all methods use the supplied transaction context', async () => {
	const original = registration('original-client');
	const virtual = { ...registration('virtual-client'), isFirstParty: true };
	await rows.save([
		original,
		registration('remove-client'),
		registration('unused-client'),
		virtual,
	]);
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
			expect(await clients.removeVirtualClients([virtual.id], ctx)).toBe(1);
			throw rollback;
		}),
	).rejects.toBe(rollback);

	expect(await rows.findOneBy({ id: original.id })).toMatchObject(original);
	expect(await rows.findOneBy({ id: 'new-client' })).toBeNull();
	expect(await rows.findOneBy({ id: 'remove-client' })).not.toBeNull();
	expect(await rows.findOneBy({ id: 'unused-client' })).not.toBeNull();
	expect(await rows.findOneBy({ id: virtual.id })).not.toBeNull();
});
