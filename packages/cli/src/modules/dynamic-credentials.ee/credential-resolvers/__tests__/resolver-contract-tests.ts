import type {
	CredentialResolverConfiguration,
	CredentialResolverHandle,
	ICredentialResolver,
} from '@n8n/decorators';
import {
	CredentialResolverDataNotFoundError,
	CredentialResolverValidationError,
} from '@n8n/decorators';
import type { ICredentialContext, ICredentialDataDecryptedObject } from 'n8n-workflow';

/**
 * Configuration for resolver contract tests
 */
export interface ResolverContractTestConfig {
	/** Factory function to create a fresh resolver instance for each test */
	createResolver: () => ICredentialResolver | Promise<ICredentialResolver>;

	/** Optional async setup function called before all tests */
	beforeAll?: () => Promise<void>;

	/** Optional async teardown function called after all tests */
	afterAll?: () => Promise<void>;

	/** Optional cleanup function called after each test */
	afterEach?: () => Promise<void>;

	/** Test cases for options validation */
	validationTests: {
		/** Valid options that should pass validation */
		validOptions: Array<[string, CredentialResolverConfiguration]>;
		/** Invalid options that should fail validation */
		invalidOptions: Array<[string, CredentialResolverConfiguration]>;
	};
}

/**
 * Helper functions for creating test data
 */
export const testHelpers = {
	/** Creates a test credential context with the given identity */
	createContext: (identity: string): ICredentialContext => ({
		identity,
		version: 1,
	}),

	/** Creates test credential data */
	createCredentialData: (data: Record<string, unknown> = {}): ICredentialDataDecryptedObject => ({
		apiKey: 'test-key-123',
		apiSecret: 'test-secret-456',
		...data,
	}),

	/** Creates a credential resolver handle with the given configuration */
	createHandle: (configuration: CredentialResolverConfiguration): CredentialResolverHandle => ({
		configuration,
		resolverName: 'test-resolver',
		resolverId: 'test-resolver-id',
	}),

	/** Generates a random credential ID for isolation */
	randomCredentialId: (): string => `cred-${Math.random().toString(36).substring(7)}`,

	/** Generates a random identity for isolation */
	randomIdentity: (): string => `identity-${Math.random().toString(36).substring(7)}`,
};

/**
 * Reusable test suite for ICredentialResolver contract compliance.
 * Tests that any resolver implementation correctly implements the interface contract.
 *
 * @example
 * describe('MyResolver', () => {
 *   testCredentialResolverContract({
 *     createResolver: () => new MyResolver(deps),
 *     validationTests: {
 *       validOptions: [{ endpoint: 'https://api.example.com' }],
 *       invalidOptions: [{ options: { endpoint: 123 }, description: 'invalid endpoint type' }],
 *     },
 *   });
 * });
 */
export function testCredentialResolverContract(config: ResolverContractTestConfig) {
	const { createResolver, validationTests } = config;

	let resolver: ICredentialResolver;

	describe('ICredentialResolver contract', () => {
		beforeAll(async () => {
			if (config.beforeAll) {
				await config.beforeAll();
			}
		});

		afterAll(async () => {
			if (config.afterAll) {
				await config.afterAll();
			}
		});

		beforeEach(async () => {
			resolver = await createResolver();
		});

		afterEach(async () => {
			if (config.afterEach) {
				await config.afterEach();
			}
		});

		describe('validateOptions', () => {
			it.each(validationTests.validOptions)(
				'should accept valid options: %s',
				async (_, options) => {
					await expect(resolver.validateOptions(options)).resolves.not.toThrow();
				},
			);

			it.each(validationTests.invalidOptions)(
				'should reject invalid options: %s',
				async (_, options) => {
					await expect(resolver.validateOptions(options)).rejects.toThrow(
						CredentialResolverValidationError,
					);
				},
			);
		});

		describe('getSecret', () => {
			it('should throw CredentialResolverDataNotFoundError when data does not exist', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
			});

			it('should return data that was previously stored', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const data = testHelpers.createCredentialData();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await resolver.setSecret(credentialId, context, data, handle);
				const retrieved = await resolver.getSecret(credentialId, context, handle);

				expect(retrieved).toEqual(data);
			});

			it('should throw when retrieving after delete (if deleteSecret exists)', async () => {
				if (!resolver.deleteSecret) {
					return; // Skip if deleteSecret not implemented
				}

				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const data = testHelpers.createCredentialData();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await resolver.setSecret(credentialId, context, data, handle);
				await resolver.deleteSecret(credentialId, context, handle);

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
			});
		});

		describe('setSecret', () => {
			it('should store data that can be retrieved', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const data = testHelpers.createCredentialData();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await resolver.setSecret(credentialId, context, data, handle);
				const retrieved = await resolver.getSecret(credentialId, context, handle);

				expect(retrieved).toEqual(data);
			});

			it('should overwrite existing data', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				await resolver.setSecret(credentialId, context, data1, handle);
				await resolver.setSecret(credentialId, context, data2, handle);

				const retrieved = await resolver.getSecret(credentialId, context, handle);
				expect(retrieved).toEqual(data2);
			});
		});

		describe('deleteSecret (if implemented)', () => {
			it('should remove stored data', async () => {
				if (!resolver.deleteSecret) {
					return; // Skip if deleteSecret not implemented
				}

				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const data = testHelpers.createCredentialData();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await resolver.setSecret(credentialId, context, data, handle);
				await resolver.deleteSecret(credentialId, context, handle);

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
			});

			it('should be idempotent (deleting twice should not error)', async () => {
				if (!resolver.deleteSecret) {
					return; // Skip if deleteSecret not implemented
				}

				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const data = testHelpers.createCredentialData();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await resolver.setSecret(credentialId, context, data, handle);
				await resolver.deleteSecret(credentialId, context, handle);
				await expect(resolver.deleteSecret(credentialId, context, handle)).resolves.not.toThrow();
			});

			it('should not error when deleting non-existent data', async () => {
				if (!resolver.deleteSecret) {
					return; // Skip if deleteSecret not implemented
				}

				const credentialId = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				await expect(resolver.deleteSecret(credentialId, context, handle)).resolves.not.toThrow();
			});
		});

		describe('isolation', () => {
			it('should isolate data by credential ID', async () => {
				const credentialId1 = testHelpers.randomCredentialId();
				const credentialId2 = testHelpers.randomCredentialId();
				const context = testHelpers.createContext(testHelpers.randomIdentity());
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				await resolver.setSecret(credentialId1, context, data1, handle);
				await resolver.setSecret(credentialId2, context, data2, handle);

				const retrieved1 = await resolver.getSecret(credentialId1, context, handle);
				const retrieved2 = await resolver.getSecret(credentialId2, context, handle);

				expect(retrieved1).toEqual(data1);
				expect(retrieved2).toEqual(data2);
			});

			it('should isolate data by identity', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const identity1 = testHelpers.randomIdentity();
				const identity2 = testHelpers.randomIdentity();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				const context1 = testHelpers.createContext(identity1);
				const context2 = testHelpers.createContext(identity2);

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				await resolver.setSecret(credentialId, context1, data1, handle);
				await resolver.setSecret(credentialId, context2, data2, handle);

				const retrieved1 = await resolver.getSecret(credentialId, context1, handle);
				const retrieved2 = await resolver.getSecret(credentialId, context2, handle);

				expect(retrieved1).toEqual(data1);
				expect(retrieved2).toEqual(data2);
			});

			it('should use same storage for same credential ID and identity', async () => {
				const credentialId = testHelpers.randomCredentialId();
				const identity = testHelpers.randomIdentity();
				const context = testHelpers.createContext(identity);
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				const data = testHelpers.createCredentialData();

				await resolver.setSecret(credentialId, context, data, handle);

				// Create a new context with same identity
				const sameContext = testHelpers.createContext(identity);
				const retrieved = await resolver.getSecret(credentialId, sameContext, handle);

				expect(retrieved).toEqual(data);
			});

			it('should not affect other identities when deleting (if deleteSecret exists)', async () => {
				if (!resolver.deleteSecret) {
					return; // Skip if deleteSecret not implemented
				}

				const credentialId = testHelpers.randomCredentialId();
				const identity1 = testHelpers.randomIdentity();
				const identity2 = testHelpers.randomIdentity();
				const options = validationTests.validOptions[0][1];
				const handle = testHelpers.createHandle(options);

				const context1 = testHelpers.createContext(identity1);
				const context2 = testHelpers.createContext(identity2);

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				await resolver.setSecret(credentialId, context1, data1, handle);
				await resolver.setSecret(credentialId, context2, data2, handle);

				await resolver.deleteSecret(credentialId, context1, handle);

				// Identity1 should be deleted
				await expect(resolver.getSecret(credentialId, context1, handle)).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);

				// Identity2 should still exist
				const retrieved2 = await resolver.getSecret(credentialId, context2, handle);
				expect(retrieved2).toEqual(data2);
			});
		});
	});
}
