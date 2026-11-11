import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';

let providerRepository: PromotionProviderRepository;
let environmentRepository: PromotionEnvironmentRepository;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	environmentRepository = Container.get(PromotionEnvironmentRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await environmentRepository.delete({});
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
	return await environmentRepository.insertEnvironment({
		name: 'environment',
		scope: 'projects',
		providerId,
		remote,
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
	});
}

describe('findExistingIds', () => {
	it('returns only the IDs that still have a row', async () => {
		const provider = await insertProvider('git');
		const environment = await insertEnvironment(provider.id, {
			schemaVersion: 1,
			remoteUrl: 'https://example.com/org/repo.git',
		});
		const deletedId = uuidv7();

		const existing = await environmentRepository.findExistingIds([environment.id, deletedId]);

		expect(existing).toEqual(new Set([environment.id]));
	});

	it('returns an empty set for an empty list', async () => {
		await expect(environmentRepository.findExistingIds([])).resolves.toEqual(new Set());
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

		const ids = await environmentRepository.findIdsWithRepositoryPathByProvider(gitlab.id);

		expect(ids).toEqual([byPath.id]);
	});
});
