import type { Logger } from '@n8n/backend-common';
import type {
	ICredentialResolver,
	CredentialResolverClass,
	CredentialResolverEntryMetadata,
	CredentialResolverConfiguration,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ICredentialContext, ICredentialDataDecryptedObject } from 'n8n-workflow';

import { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';

describe('DynamicCredentialResolverRegistry', () => {
	let registry: DynamicCredentialResolverRegistry;
	let mockLogger: jest.Mocked<Logger>;
	let mockMetadata: jest.Mocked<CredentialResolverEntryMetadata>;

	// Mock resolver classes
	const createMockResolver = (
		name: string,
		hasInit = false,
		initShouldFail = false,
	): ICredentialResolver => ({
		metadata: {
			name,
			description: `${name} resolver`,
		},
		async getSecret(
			_credentialId: string,
			_context: ICredentialContext,
			_options: CredentialResolverConfiguration,
		): Promise<ICredentialDataDecryptedObject> {
			return {};
		},
		async setSecret(
			_credentialId: string,
			_context: ICredentialContext,
			_data: ICredentialDataDecryptedObject,
			_options: CredentialResolverConfiguration,
		): Promise<void> {},
		async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {},
		...(hasInit && {
			async init() {
				if (initShouldFail) {
					throw new Error('Init failed');
				}
			},
		}),
	});

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockMetadata = {
			getClasses: jest.fn(),
		} as unknown as jest.Mocked<CredentialResolverEntryMetadata>;

		registry = new DynamicCredentialResolverRegistry(mockMetadata, mockLogger);
	});

	describe('init', () => {
		describe('successful registration', () => {
			it('should register a single resolver', async () => {
				const mockResolver = createMockResolver('test.resolver');
				const MockResolverClass = jest.fn(() => mockResolver) as unknown as CredentialResolverClass;
				Object.defineProperty(MockResolverClass, 'name', { value: 'TestResolver' });

				mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
				jest.spyOn(Container, 'get').mockReturnValue(mockResolver);

				await registry.init();

				expect(mockLogger.debug).toHaveBeenCalledWith('Registering 1 credential resolvers.');
				expect(registry.getResolverByTypename('test.resolver')).toBe(mockResolver);
				expect(registry.getAllResolvers()).toEqual([mockResolver]);
			});

			it('should register multiple resolvers', async () => {
				const resolver1 = createMockResolver('oauth.resolver');
				const resolver2 = createMockResolver('stub.resolver');
				const resolver3 = createMockResolver('api.resolver');

				const MockClass1 = jest.fn(() => resolver1) as unknown as CredentialResolverClass;
				const MockClass2 = jest.fn(() => resolver2) as unknown as CredentialResolverClass;
				const MockClass3 = jest.fn(() => resolver3) as unknown as CredentialResolverClass;

				Object.defineProperty(MockClass1, 'name', { value: 'OAuthResolver' });
				Object.defineProperty(MockClass2, 'name', { value: 'StubResolver' });
				Object.defineProperty(MockClass3, 'name', { value: 'ApiResolver' });

				mockMetadata.getClasses.mockReturnValue([MockClass1, MockClass2, MockClass3]);

				const containerGetSpy = jest.spyOn(Container, 'get');
				containerGetSpy.mockReturnValueOnce(resolver1);
				containerGetSpy.mockReturnValueOnce(resolver2);
				containerGetSpy.mockReturnValueOnce(resolver3);

				await registry.init();

				expect(mockLogger.debug).toHaveBeenCalledWith('Registering 3 credential resolvers.');
				expect(registry.getAllResolvers()).toHaveLength(3);
				expect(registry.getResolverByTypename('oauth.resolver')).toBe(resolver1);
				expect(registry.getResolverByTypename('stub.resolver')).toBe(resolver2);
				expect(registry.getResolverByTypename('api.resolver')).toBe(resolver3);
			});

			it('should handle empty resolver list', async () => {
				mockMetadata.getClasses.mockReturnValue([]);

				await registry.init();

				expect(mockLogger.debug).toHaveBeenCalledWith('Registering 0 credential resolvers.');
				expect(registry.getAllResolvers()).toEqual([]);
			});

			it('should call init() method on resolvers that have it', async () => {
				const mockResolver = createMockResolver('test.resolver', true);
				const initSpy = jest.spyOn(mockResolver, 'init' as any);

				const MockResolverClass = jest.fn(() => mockResolver) as unknown as CredentialResolverClass;
				Object.defineProperty(MockResolverClass, 'name', { value: 'TestResolver' });

				mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
				jest.spyOn(Container, 'get').mockReturnValue(mockResolver);

				await registry.init();

				expect(initSpy).toHaveBeenCalled();
				expect(registry.getResolverByTypename('test.resolver')).toBe(mockResolver);
			});

			it('should clear previous registrations on re-init', async () => {
				const resolver1 = createMockResolver('resolver1');
				const resolver2 = createMockResolver('resolver2');

				const MockClass1 = jest.fn(() => resolver1) as unknown as CredentialResolverClass;
				const MockClass2 = jest.fn(() => resolver2) as unknown as CredentialResolverClass;

				Object.defineProperty(MockClass1, 'name', { value: 'Resolver1' });
				Object.defineProperty(MockClass2, 'name', { value: 'Resolver2' });

				// First init with resolver1
				mockMetadata.getClasses.mockReturnValue([MockClass1]);
				jest.spyOn(Container, 'get').mockReturnValue(resolver1);
				await registry.init();

				expect(registry.getAllResolvers()).toEqual([resolver1]);

				// Re-init with resolver2
				mockMetadata.getClasses.mockReturnValue([MockClass2]);
				jest.spyOn(Container, 'get').mockReturnValue(resolver2);
				await registry.init();

				expect(registry.getAllResolvers()).toEqual([resolver2]);
				expect(registry.getResolverByTypename('resolver1')).toBeUndefined();
			});
		});

		describe('error handling', () => {
			it('should skip resolver when instantiation fails', async () => {
				const MockResolverClass = jest.fn() as unknown as CredentialResolverClass;
				Object.defineProperty(MockResolverClass, 'name', { value: 'FailingResolver' });

				mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
				jest.spyOn(Container, 'get').mockImplementation(() => {
					throw new Error('Instantiation failed');
				});

				await registry.init();

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to instantiate credential resolver class "FailingResolver": Instantiation failed',
					{ error: expect.any(Error) },
				);
				expect(registry.getAllResolvers()).toEqual([]);
			});

			it('should skip resolver when init() fails', async () => {
				const mockResolver = createMockResolver('test.resolver', true, true);
				const MockResolverClass = jest.fn(() => mockResolver) as unknown as CredentialResolverClass;
				Object.defineProperty(MockResolverClass, 'name', { value: 'TestResolver' });

				mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
				jest.spyOn(Container, 'get').mockReturnValue(mockResolver);

				await registry.init();

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to initialize credential resolver "test.resolver": Init failed',
					{ error: expect.any(Error) },
				);
				expect(registry.getResolverByTypename('test.resolver')).toBeUndefined();
				expect(registry.getAllResolvers()).toEqual([]);
			});

			it('should skip duplicate resolver names and log warning', async () => {
				const MockClass1 = jest.fn() as unknown as CredentialResolverClass;
				const MockClass2 = jest.fn() as unknown as CredentialResolverClass;

				Object.defineProperty(MockClass1, 'name', { value: 'FirstResolver' });
				Object.defineProperty(MockClass2, 'name', { value: 'SecondResolver' });

				const resolver1 = createMockResolver('duplicate.name');
				const resolver2 = createMockResolver('duplicate.name');

				// Set proper constructor reference so constructor.name works
				Object.defineProperty(resolver1, 'constructor', { value: MockClass1 });
				Object.defineProperty(resolver2, 'constructor', { value: MockClass2 });

				mockMetadata.getClasses.mockReturnValue([MockClass1, MockClass2]);

				const containerGetSpy = jest.spyOn(Container, 'get');
				containerGetSpy.mockReturnValueOnce(resolver1);
				containerGetSpy.mockReturnValueOnce(resolver2);

				await registry.init();

				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Credential resolver with name "duplicate.name" is already registered. Conflicting classes are "FirstResolver" and "SecondResolver". Skipping the latter.',
				);
				expect(registry.getAllResolvers()).toHaveLength(1);
				expect(registry.getResolverByTypename('duplicate.name')).toBe(resolver1);
			});

			it('should continue registering other resolvers when one fails', async () => {
				const resolver1 = createMockResolver('success.resolver');
				const resolver3 = createMockResolver('another.success');

				const MockClass1 = jest.fn(() => resolver1) as unknown as CredentialResolverClass;
				const MockClass2 = jest.fn() as unknown as CredentialResolverClass;
				const MockClass3 = jest.fn(() => resolver3) as unknown as CredentialResolverClass;

				Object.defineProperty(MockClass1, 'name', { value: 'SuccessResolver' });
				Object.defineProperty(MockClass2, 'name', { value: 'FailingResolver' });
				Object.defineProperty(MockClass3, 'name', { value: 'AnotherSuccessResolver' });

				mockMetadata.getClasses.mockReturnValue([MockClass1, MockClass2, MockClass3]);

				const containerGetSpy = jest.spyOn(Container, 'get');
				containerGetSpy.mockReturnValueOnce(resolver1);
				containerGetSpy.mockImplementationOnce(() => {
					throw new Error('Failed');
				});
				containerGetSpy.mockReturnValueOnce(resolver3);

				await registry.init();

				expect(registry.getAllResolvers()).toHaveLength(2);
				expect(registry.getResolverByTypename('success.resolver')).toBe(resolver1);
				expect(registry.getResolverByTypename('another.success')).toBe(resolver3);
			});
		});
	});

	describe('getResolverByName', () => {
		it('should return resolver by name', async () => {
			const mockResolver = createMockResolver('test.resolver');
			const MockResolverClass = jest.fn(() => mockResolver) as unknown as CredentialResolverClass;
			Object.defineProperty(MockResolverClass, 'name', { value: 'TestResolver' });

			mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
			jest.spyOn(Container, 'get').mockReturnValue(mockResolver);

			await registry.init();

			const result = registry.getResolverByTypename('test.resolver');

			expect(result).toBe(mockResolver);
		});

		it('should return undefined for non-existent resolver', async () => {
			mockMetadata.getClasses.mockReturnValue([]);
			await registry.init();

			const result = registry.getResolverByTypename('non.existent');

			expect(result).toBeUndefined();
		});
	});

	describe('getAllResolvers', () => {
		it('should return all registered resolvers', async () => {
			const resolver1 = createMockResolver('resolver1');
			const resolver2 = createMockResolver('resolver2');

			const MockClass1 = jest.fn(() => resolver1) as unknown as CredentialResolverClass;
			const MockClass2 = jest.fn(() => resolver2) as unknown as CredentialResolverClass;

			Object.defineProperty(MockClass1, 'name', { value: 'Resolver1' });
			Object.defineProperty(MockClass2, 'name', { value: 'Resolver2' });

			mockMetadata.getClasses.mockReturnValue([MockClass1, MockClass2]);

			const containerGetSpy = jest.spyOn(Container, 'get');
			containerGetSpy.mockReturnValueOnce(resolver1);
			containerGetSpy.mockReturnValueOnce(resolver2);

			await registry.init();

			const result = registry.getAllResolvers();

			expect(result).toHaveLength(2);
			expect(result).toContain(resolver1);
			expect(result).toContain(resolver2);
		});

		it('should return empty array when no resolvers registered', async () => {
			mockMetadata.getClasses.mockReturnValue([]);
			await registry.init();

			const result = registry.getAllResolvers();

			expect(result).toEqual([]);
		});

		it('should not allow mutation of internal map', async () => {
			const mockResolver = createMockResolver('test.resolver');
			const MockResolverClass = jest.fn(() => mockResolver) as unknown as CredentialResolverClass;
			Object.defineProperty(MockResolverClass, 'name', { value: 'TestResolver' });

			mockMetadata.getClasses.mockReturnValue([MockResolverClass]);
			jest.spyOn(Container, 'get').mockReturnValue(mockResolver);

			await registry.init();

			const resolvers = registry.getAllResolvers();
			resolvers.pop(); // Try to mutate returned array

			// Original should still have the resolver
			expect(registry.getAllResolvers()).toHaveLength(1);
		});
	});
});
