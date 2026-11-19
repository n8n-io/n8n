import { testDb, testModules } from '@n8n/backend-test-utils';
import { isUniqueConstraintError, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { McpRegistryServerEntity } from '@/modules/mcp-registry/registry/mcp-registry-server.entity';
import { createCredentials } from '@test-integration/db/credentials';
import { createUser } from '@test-integration/db/users';

import { InstanceAiMcpRegistryConnection } from '../../entities/instance-ai-mcp-registry-connection.entity';
import { InstanceAiMcpRegistryConnectionRepository } from '../instance-ai-mcp-registry-connection.repository';

describe('InstanceAiMcpRegistryConnectionRepository', () => {
	let repository: InstanceAiMcpRegistryConnectionRepository;
	let rows: Repository<InstanceAiMcpRegistryConnection>;
	const userId = randomUUID();
	const otherUserId = randomUUID();
	const credentialIds = [randomUUID(), randomUUID(), randomUUID()];
	const toolPermissions: InstanceAiMcpRegistryConnection['toolPermissions'] = {
		categories: { read: 'always_allow', write: 'require_approval' },
		tools: { search: 'blocked', create: 'require_approval' },
	};

	function connectionValues(overrides: Partial<InstanceAiMcpRegistryConnection> = {}) {
		return {
			id: randomUUID(),
			userId,
			serverSlug: 'test-server',
			credentialId: credentialIds[0],
			toolPermissions,
			...overrides,
		};
	}

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai', 'mcp-registry']);
		await testDb.init();
		repository = Container.get(InstanceAiMcpRegistryConnectionRepository);
		rows = Container.get(DataSource).getRepository(InstanceAiMcpRegistryConnection);
		await createUser({ id: userId });
		await createUser({ id: otherUserId });
		for (const id of credentialIds) {
			await createCredentials({ id, name: 'Test credential', type: 'mcpOAuth2Api', data: '' });
		}
		const servers = Container.get(DataSource).getRepository(McpRegistryServerEntity);
		await servers.save(
			['test-server', 'other-server', 'changed-server', 'new-server'].map((slug) =>
				servers.create({
					slug,
					status: 'active',
					version: '1.0.0',
					registryUpdatedAt: new Date(),
					data: {
						name: slug,
						title: slug,
						tagline: 'Test server',
						description: 'Test server',
						authType: 'none',
						origin: 'registry',
						isOfficial: false,
						icons: [],
						remotes: [],
						tools: [],
					},
				}),
			),
		);
	});

	afterEach(async () => {
		await rows.clear();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('scopes reads by user, server slug, and connection id', async () => {
		const [first, second, otherUser] = await rows.save([
			rows.create(connectionValues()),
			rows.create(connectionValues({ serverSlug: 'other-server' })),
			rows.create(connectionValues({ userId: otherUserId })),
		]);

		expect(await repository.findByUserId(userId, {})).toEqual(
			expect.arrayContaining([first, second]),
		);
		expect(await repository.findByUserId(userId, {})).toHaveLength(2);
		expect(await repository.findByUserIdAndServerSlug(userId, first.serverSlug, {})).toEqual(first);
		expect(await repository.findByUserIdAndServerSlug(otherUserId, first.serverSlug, {})).toEqual(
			otherUser,
		);
		expect(await repository.findByIdAndUserId(first.id, userId, {})).toEqual(first);
		expect(await repository.findByIdAndUserId(first.id, otherUserId, {})).toBeNull();
		expect(await repository.findByIdAndUserId(randomUUID(), userId, {})).toBeNull();
		expect(await repository.findByUserIdAndServerSlug(userId, 'missing', {})).toBeNull();
		expect(await repository.findByUserId(randomUUID(), {})).toEqual([]);
	});

	it('constructs and saves a connection with its caller-supplied id and JSON permissions', async () => {
		const values = connectionValues();

		const saved = await repository.createConnection(values, {});

		expect(saved).toBeInstanceOf(InstanceAiMcpRegistryConnection);
		expect(saved).toMatchObject(values);
		expect(saved.createdAt).toBeInstanceOf(Date);
		expect(saved.updatedAt).toBeInstanceOf(Date);
		expect(await rows.findOneByOrFail({ id: values.id })).toEqual(saved);
	});

	it('keeps save behavior when creation receives an existing primary key', async () => {
		const original = await rows.save(rows.create(connectionValues()));
		const values = connectionValues({ id: original.id, serverSlug: 'changed-server' });

		const saved = await repository.createConnection(values, {});

		expect(saved).toMatchObject(values);
		expect(await rows.find()).toEqual([
			expect.objectContaining({ ...values, createdAt: original.createdAt }),
		]);
	});

	it('saves loaded connection changes and returns the saved entity', async () => {
		const original = await rows.save(rows.create(connectionValues()));
		const loaded = await rows.findOneByOrFail({ id: original.id });
		loaded.credentialId = credentialIds[1];
		loaded.toolPermissions = {
			categories: { read: 'blocked', write: 'always_allow' },
			tools: { search: 'require_approval' },
		};

		const saved = await repository.saveConnectionChanges(loaded, {});

		expect(saved).toBe(loaded);
		expect(saved.createdAt).toEqual(original.createdAt);
		expect(await rows.find()).toEqual([saved]);
		expect(saved.toolPermissions).toEqual(loaded.toolPermissions);
	});

	it('keeps duplicate errors for both creation and saved changes', async () => {
		const original = await rows.save(rows.create(connectionValues()));
		const duplicate = connectionValues({
			serverSlug: original.serverSlug,
			credentialId: original.credentialId,
		});

		await expect(repository.createConnection(duplicate, {})).rejects.toSatisfy(
			isUniqueConstraintError,
		);
		const other = await rows.save(
			rows.create(connectionValues({ credentialId: credentialIds[1] })),
		);
		other.credentialId = original.credentialId;
		await expect(repository.saveConnectionChanges(other, {})).rejects.toSatisfy(
			isUniqueConstraintError,
		);
		expect(await rows.count()).toBe(2);
	});

	it('deletes only the requested id and returns void for missing rows', async () => {
		const [first, second] = await rows.save([
			rows.create(connectionValues()),
			rows.create(connectionValues({ credentialId: credentialIds[1] })),
		]);

		await expect(repository.deleteById(first.id, {})).resolves.toBeUndefined();
		await expect(repository.deleteById(first.id, {})).resolves.toBeUndefined();
		expect(await rows.find()).toEqual([second]);
	});

	it('deletes only the requested user connections and returns the affected count', async () => {
		const [, , otherUser] = await rows.save([
			rows.create(connectionValues()),
			rows.create(connectionValues({ credentialId: credentialIds[1] })),
			rows.create(connectionValues({ userId: otherUserId })),
		]);

		expect(await repository.deleteByUserId(userId, {})).toBe(2);
		expect(await repository.deleteByUserId(userId, {})).toBe(0);
		expect(await rows.find()).toEqual([otherUser]);
	});

	it('routes all operations through the supplied transaction and rolls back its writes', async () => {
		const originals = await rows.save([
			rows.create(connectionValues()),
			rows.create(connectionValues({ userId: otherUserId })),
		]);
		const values = connectionValues({ serverSlug: 'new-server' });
		const failure = new Error('Roll back connection changes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				const created = await repository.createConnection(values, ctx);
				expect(await repository.findByUserId(userId, ctx)).toHaveLength(2);
				expect(await repository.findByUserIdAndServerSlug(userId, values.serverSlug, ctx)).toEqual(
					created,
				);
				const loaded = await repository.findByIdAndUserId(values.id, userId, ctx);
				expect(loaded).toEqual(created);
				loaded!.credentialId = credentialIds[1];
				const saved = await repository.saveConnectionChanges(loaded!, ctx);
				expect(await repository.findByIdAndUserId(values.id, userId, ctx)).toEqual(saved);
				await repository.deleteById(originals[0].id, ctx);
				expect(await repository.findByIdAndUserId(originals[0].id, userId, ctx)).toBeNull();
				expect(await repository.deleteByUserId(otherUserId, ctx)).toBe(1);
				expect(await repository.findByUserId(otherUserId, ctx)).toEqual([]);
				throw failure;
			}),
		).rejects.toBe(failure);

		expect(await rows.find()).toHaveLength(2);
		expect(await rows.find()).toEqual(expect.arrayContaining(originals));
	});
});
