import { testDb, testModules } from '@n8n/backend-test-utils';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';

describe('DynamicCredentialResolverRepository', () => {
	let resolverRepository: DynamicCredentialResolverRepository;
	let credentialsRepository: CredentialsRepository;
	let previousEnvVar: string | undefined;

	beforeAll(async () => {
		previousEnvVar = process.env.N8N_ENV_FEAT_CONTEXT_ESTABLISHMENT_HOOKS;
		process.env.N8N_ENV_FEAT_CONTEXT_ESTABLISHMENT_HOOKS = 'true';
		await testModules.loadModules(['dynamic-credentials']);
		await testDb.init();
		resolverRepository = Container.get(DynamicCredentialResolverRepository);
		credentialsRepository = Container.get(CredentialsRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['CredentialsEntity', 'DynamicCredentialResolver']);
	});

	afterAll(async () => {
		process.env.N8N_ENV_FEAT_CONTEXT_ESTABLISHMENT_HOOKS = previousEnvVar;
		await testDb.terminate();
	});

	it('should create and find a resolver', async () => {
		const resolver = resolverRepository.create({
			name: 'Test Resolver',
			type: 'oauth2',
			config: JSON.stringify({ clientId: 'test' }),
		});
		const saved = await resolverRepository.save(resolver);

		const found = await resolverRepository.findOne({ where: { id: saved.id } });

		expect(found).toMatchObject({
			id: saved.id,
			name: 'Test Resolver',
			type: 'oauth2',
		});
	});

	describe('relationship with CredentialsEntity', () => {
		let resolver: DynamicCredentialResolver;

		beforeEach(async () => {
			resolver = await resolverRepository.save(
				resolverRepository.create({
					name: 'Test Resolver',
					type: 'oauth2',
					config: JSON.stringify({}),
				}),
			);
		});

		it('should link credentials to resolver and query them', async () => {
			await credentialsRepository.save([
				credentialsRepository.create({
					name: 'Cred 1',
					type: 'oauth2',
					data: '',
					isResolvable: true,
					resolverId: resolver.id,
				}),
				credentialsRepository.create({
					name: 'Cred 2',
					type: 'oauth2',
					data: '',
					isResolvable: true,
					resolvableAllowFallback: true,
					resolverId: resolver.id,
				}),
			]);

			const linked = await credentialsRepository.find({ where: { resolverId: resolver.id } });

			expect(linked).toHaveLength(2);
			expect(linked[0].resolverId).toBe(resolver.id);
			expect(linked[1].resolvableAllowFallback).toBe(true);
		});

		it('should handle nullable resolverId', async () => {
			const credential = await credentialsRepository.save(
				credentialsRepository.create({
					name: 'Standalone',
					type: 'apiKey',
					data: '',
					isResolvable: false,
				}),
			);

			expect(credential.resolverId).toBeNull();
		});

		it('should set resolverId to null on resolver deletion (CASCADE SET NULL)', async () => {
			const credential = await credentialsRepository.save(
				credentialsRepository.create({
					name: 'Linked',
					type: 'oauth2',
					data: '',
					isResolvable: true,
					resolverId: resolver.id,
				}),
			);

			await resolverRepository.delete(resolver.id);
			const orphaned = await credentialsRepository.findOneBy({ id: credential.id });

			expect(orphaned?.resolverId).toBeNull();
		});
	});
});
