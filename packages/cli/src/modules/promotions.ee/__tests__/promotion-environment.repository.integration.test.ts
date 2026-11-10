import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';

let providerRepository: PromotionProviderRepository;
let environmentRepository: PromotionEnvironmentRepository;
let environmentRows: Repository<PromotionEnvironment>;
let transactionRunner: TransactionRunner;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	environmentRepository = Container.get(PromotionEnvironmentRepository);
	environmentRows = Container.get(DataSource).getRepository(PromotionEnvironment);
	transactionRunner = Container.get(TransactionRunner);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await environmentRows.delete({});
	await providerRepository.delete({});
});

async function insertProvider(type: 'git' | 'gitlab') {
	return await providerRepository.insertProvider({
		name: type,
		type,
		authType: 'token',
		config:
			type === 'gitlab'
				? { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' }
				: { schemaVersion: 1 },
		auth: `encrypted-${type}`,
	});
}

async function insertEnvironment(
	providerId: string,
	remote: { schemaVersion: 1; remoteUrl: string } | { schemaVersion: 1; repositoryPath: string },
) {
	return await environmentRepository.insertEnvironment(
		{
			name: 'environment',
			scope: 'projects',
			providerId,
			remote,
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		},
		{},
	);
}

test("methods that take ctx run inside the caller's transaction", async () => {
	const provider = await providerRepository.insertProvider({
		name: 'repo',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: 'encrypted-repo',
	});
	const row = {
		name: 'repo',
		scope: 'instance',
		providerId: provider.id,
		remote: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
		direction: 'apply',
		settings: { schemaVersion: 1, branchName: 'dev' },
	} as const;
	const rollback = new Error('Roll back test changes');
	let environmentId = '';

	await expect(
		transactionRunner.run({}, async (ctx) => {
			const environment = await environmentRepository.insertEnvironment(row, ctx);
			environmentId = environment.id;

			expect(await environmentRepository.findByIdWithProvider(environment.id, ctx)).toMatchObject({
				...row,
				provider: { id: provider.id, name: 'repo' },
			});
			expect(await environmentRepository.findInstanceEnvironment('apply', ctx)).toMatchObject({
				id: environment.id,
				provider: { id: provider.id },
			});
			expect(await environmentRepository.countByProviderId(provider.id, ctx)).toBe(1);
			expect(
				await environmentRepository.listEnvironments(
					{ offset: 0, limit: 10, filter: { providerId: provider.id } },
					ctx,
				),
			).toMatchObject({ count: 1, data: [{ id: environment.id }] });
			expect(await environmentRepository.findExistingIds([environment.id], ctx)).toEqual(
				new Set([environment.id]),
			);
			expect(
				await environmentRepository.findIdsWithRepositoryPathByProvider(provider.id, ctx),
			).toEqual([]);
			throw rollback;
		}),
	).rejects.toBe(rollback);

	expect(await environmentRows.findOneBy({ id: environmentId })).toBeNull();
});

describe('findExistingIds', () => {
	it('returns only the IDs that still have a row', async () => {
		const provider = await insertProvider('git');
		const environment = await insertEnvironment(provider.id, {
			schemaVersion: 1,
			remoteUrl: 'https://example.com/org/repo.git',
		});
		const deletedId = uuidv7();

		const existing = await environmentRepository.findExistingIds([environment.id, deletedId], {});

		expect(existing).toEqual(new Set([environment.id]));
	});

	it('returns an empty set for an empty list', async () => {
		await expect(environmentRepository.findExistingIds([], {})).resolves.toEqual(new Set());
	});
});

describe('findIdsWithRepositoryPathByProvider', () => {
	it('returns the environments of the provider that store a repository path', async () => {
		const gitlab = await insertProvider('gitlab');
		const otherGitlab = await insertProvider('gitlab');
		const byPath = await insertEnvironment(gitlab.id, {
			schemaVersion: 1,
			repositoryPath: 'platform/workflows',
		});
		await insertEnvironment(gitlab.id, {
			schemaVersion: 1,
			remoteUrl: 'https://gitlab.example.com/platform/legacy.git',
		});
		await insertEnvironment(otherGitlab.id, {
			schemaVersion: 1,
			repositoryPath: 'platform/other',
		});

		const ids = await environmentRepository.findIdsWithRepositoryPathByProvider(gitlab.id, {});

		expect(ids).toEqual([byPath.id]);
	});
});
