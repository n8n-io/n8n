import { Container } from '@n8n/di';
import type { ICredentialContext, ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { CredentialResolverConfiguration, ICredentialResolver } from '../credential-resolver';
import {
	CredentialResolver,
	CredentialResolverEntryMetadata,
} from '../credential-resolver-metadata';

describe('@CredentialResolver decorator', () => {
	let resolverMetadata: CredentialResolverEntryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();

		resolverMetadata = new CredentialResolverEntryMetadata();
		Container.set(CredentialResolverEntryMetadata, resolverMetadata);
	});

	it('should register resolver in CredentialResolverEntryMetadata', () => {
		@CredentialResolver()
		class TestResolver implements ICredentialResolver {
			metadata = {
				name: 'test.resolver',
				description: 'Test resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const registeredResolvers = resolverMetadata.getClasses();

		expect(registeredResolvers).toContain(TestResolver);
		expect(registeredResolvers).toHaveLength(1);
	});

	it('should register multiple resolvers', () => {
		@CredentialResolver()
		class FirstResolver implements ICredentialResolver {
			metadata = {
				name: 'first.resolver',
				description: 'First resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		@CredentialResolver()
		class SecondResolver implements ICredentialResolver {
			metadata = {
				name: 'second.resolver',
				description: 'Second resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		@CredentialResolver()
		class ThirdResolver implements ICredentialResolver {
			metadata = {
				name: 'third.resolver',
				description: 'Third resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const registeredResolvers = resolverMetadata.getClasses();

		expect(registeredResolvers).toContain(FirstResolver);
		expect(registeredResolvers).toContain(SecondResolver);
		expect(registeredResolvers).toContain(ThirdResolver);
		expect(registeredResolvers).toHaveLength(3);
	});

	it('should apply Service decorator', () => {
		@CredentialResolver()
		class TestResolver implements ICredentialResolver {
			metadata = {
				name: 'test.resolver',
				description: 'Test resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		expect(Container.has(TestResolver)).toBe(true);
	});

	it('should allow instantiation of registered resolvers with accessible metadata', () => {
		@CredentialResolver()
		class TestResolver implements ICredentialResolver {
			metadata = {
				name: 'oauth.introspection',
				description: 'OAuth introspection resolver',
				displayName: 'OAuth Introspection',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const resolverInstance = Container.get(TestResolver);

		expect(resolverInstance).toBeInstanceOf(TestResolver);
		expect(resolverInstance.metadata).toEqual({
			name: 'oauth.introspection',
			description: 'OAuth introspection resolver',
			displayName: 'OAuth Introspection',
		});
		expect(resolverInstance.metadata.name).toBe('oauth.introspection');
	});

	it('should register resolvers with different metadata', () => {
		@CredentialResolver()
		class OAuthResolver implements ICredentialResolver {
			metadata = {
				name: 'oauth.resolver',
				description: 'OAuth-based credential resolver',
				displayName: 'OAuth Resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		@CredentialResolver()
		class TestResolver implements ICredentialResolver {
			metadata = {
				name: 'test.resolver',
				description: 'Test resolver for testing',
				displayName: 'Test Resolver',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const registeredResolvers = resolverMetadata.getClasses();
		const oauthResolver = Container.get(OAuthResolver);
		const testResolver = Container.get(TestResolver);

		expect(registeredResolvers).toHaveLength(2);
		expect(oauthResolver.metadata.name).toBe('oauth.resolver');
		expect(oauthResolver.metadata.displayName).toBe('OAuth Resolver');
		expect(testResolver.metadata.name).toBe('test.resolver');
		expect(testResolver.metadata.displayName).toBe('Test Resolver');
	});

	it('should support resolvers with configuration options', () => {
		@CredentialResolver()
		class ConfigurableResolver implements ICredentialResolver {
			metadata = {
				name: 'configurable.resolver',
				description: 'Resolver with configuration options',
				options: [
					{
						displayName: 'API Endpoint',
						name: 'apiEndpoint',
						type: 'string' as const,
						default: '',
					},
				],
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const resolverInstance = Container.get(ConfigurableResolver);

		expect(resolverInstance.metadata.options).toBeDefined();
		expect(resolverInstance.metadata.options).toHaveLength(1);
		expect(resolverInstance.metadata.options[0].name).toBe('apiEndpoint');
	});

	it('should support optional deleteSecret method', () => {
		@CredentialResolver()
		class ResolverWithDelete implements ICredentialResolver {
			metadata = {
				name: 'resolver.with.delete',
				description: 'Resolver with delete support',
			};

			async getSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<ICredentialDataDecryptedObject> {
				return {};
			}

			async setSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_data: ICredentialDataDecryptedObject,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async deleteSecret(
				_credentialId: string,
				_context: ICredentialContext,
				_options: CredentialResolverConfiguration,
			): Promise<void> {}

			async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {}
		}

		const withDelete = Container.get(ResolverWithDelete);

		expect(withDelete.deleteSecret).toBeDefined();
	});
});
