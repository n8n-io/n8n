import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

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
			throw rollback;
		}),
	).rejects.toBe(rollback);

	expect(await environmentRows.findOneBy({ id: environmentId })).toBeNull();
});
