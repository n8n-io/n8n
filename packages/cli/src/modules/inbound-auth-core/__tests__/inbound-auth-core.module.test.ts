import { ModuleMetadata, type ModuleInterface } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationPipeline,
	ResourceAdmission,
	AuthenticationService,
	IdentityService,
	LocalAuthorizationServer,
	TrustedSourceGate,
	TrustedSourceStore,
} from '@n8n/inbound-auth';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AuthStrategyRegistry, ProtectedResourceRegistry } from '@n8n/backend-services/auth';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { InboundAuthPipeline } from '../authentication-pipeline';
import { OAuth2AuthenticationService } from '../authentication.service';
import { TrustedSourceIdentityService } from '../identity/trusted-source-identity.service';
import { InboundAuthCoreModule } from '../inbound-auth-core.module';
import { PublicApiOAuthStrategy } from '../public-api-oauth.strategy';
import { PublicApiProtectedResource } from '../public-api-protected-resource';
import { InboundResourceAdmission } from '../resource-admission';
import { TrustedSourceDbDirectory } from '../trusted-source-directory.service';
import { TrustedSourceDiscoveryTask } from '../trusted-source-discovery.task';
import { TrustedSourceDbGate } from '../trusted-source.gate';
import { LocalAuthorizationServerProxy } from '../local-authorization-server.proxy';
import { TrustedSourceDiscoveryService } from '../trusted-source-discovery.service';
import { TrustedSourceDbStore } from '../trusted-source.store';

// A mocked module's factory runs on its first import, so the first `init()` that imports the
// controller is the one that proves the gate. Keep the "loaded" case last.
const { loadController } = vi.hoisted(() => ({ loadController: vi.fn() }));
const FLAG = 'N8N_ENV_FEAT_TRUSTED_SOURCES_API_ENABLED';
vi.mock('../trusted-source.controller', () => {
	loadController();
	return {};
});

describe('InboundAuthCoreModule', () => {
	describe('init', () => {
		const dbStore = mock<TrustedSourceDbStore>();
		const dbGate = mock<TrustedSourceDbGate>();
		const identityService = mock<TrustedSourceIdentityService>();
		const strategyRegistry = mock<AuthStrategyRegistry>();
		const resourceRegistry = mock<ProtectedResourceRegistry>();
		const publicApiResource = mock<PublicApiProtectedResource>();
		const publicApiStrategy = mock<PublicApiOAuthStrategy>();

		beforeAll(async () => {
			// The shell may carry the flag; the first init must not be the one that imports the controller.
			vi.stubEnv(FLAG, '');
			Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType: 'main' }));
			Container.set(TrustedSourceDbStore, dbStore);
			Container.set(TrustedSourceDbGate, dbGate);
			Container.set(TrustedSourceIdentityService, identityService);
			Container.set(AuthStrategyRegistry, strategyRegistry);
			Container.set(ProtectedResourceRegistry, resourceRegistry);
			Container.set(PublicApiProtectedResource, publicApiResource);
			Container.set(PublicApiOAuthStrategy, publicApiStrategy);
			await new InboundAuthCoreModule().init();
		});

		it('binds the TrustedSourceStore contract to the database store', () => {
			expect(Container.get(TrustedSourceStore)).toBe(dbStore);
		});

		it('binds the TrustedSourceGate contract to the database gate', () => {
			expect(Container.get(TrustedSourceGate)).toBe(dbGate);
		});

		it('seeds the system trusted source once', async () => {
			// Mock history from `beforeAll` does not survive into the test, so init again here.
			dbStore.seedSystemSource.mockClear();
			await new InboundAuthCoreModule().init();

			expect(dbStore.seedSystemSource).toHaveBeenCalledTimes(1);
			expect(dbStore.seedSystemSource).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'n8n-internal' }),
			);
		});

		it.each(['webhook', 'worker'] as const)(
			'does not seed the system trusted source on a %s instance',
			async (instanceType) => {
				Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType }));
				dbStore.seedSystemSource.mockClear();

				await new InboundAuthCoreModule().init();

				expect(dbStore.seedSystemSource).not.toHaveBeenCalled();
				Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType: 'main' }));
			},
		);

		it('binds a LocalAuthorizationServer that rejects until the OAuth2 server registers itself', async () => {
			const server = Container.get(LocalAuthorizationServer);

			await expect(server.getMetadata()).rejects.toThrow(OperationalError);
			await expect(server.getJwks()).rejects.toThrow(OperationalError);
			await expect(server.isAccessTokenActive('token')).resolves.toBe(false);
		});

		it('discovers the system trusted source once the OAuth2 server registers itself', async () => {
			const discovery = mock<TrustedSourceDiscoveryService>();
			Container.set(TrustedSourceDiscoveryService, discovery);

			await Container.get(LocalAuthorizationServerProxy).registerProvider(
				mock<LocalAuthorizationServer>(),
			);

			expect(discovery.refresh).toHaveBeenCalledWith('n8n-internal');
		});

		it('binds the OAuth2 AuthenticationService', () => {
			expect(Container.get(AuthenticationService)).toBeInstanceOf(OAuth2AuthenticationService);
		});

		it('binds the IdentityService contract to the trusted-source identity service', () => {
			expect(Container.get(IdentityService)).toBe(identityService);
		});

		it('binds the AuthenticationPipeline contract to the inbound-auth pipeline', () => {
			expect(Container.get(AuthenticationPipeline)).toBeInstanceOf(InboundAuthPipeline);
		});

		it('binds the ResourceAdmission contract to the pipeline-backed admission', () => {
			expect(Container.get(ResourceAdmission)).toBeInstanceOf(InboundResourceAdmission);
		});

		describe('public API surface', () => {
			afterEach(() => {
				Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType: 'main' }));
			});

			it('registers the public API resource and its OAuth2 strategy once on a main instance', async () => {
				resourceRegistry.register.mockClear();
				strategyRegistry.register.mockClear();

				await new InboundAuthCoreModule().init();

				expect(resourceRegistry.register).toHaveBeenCalledTimes(1);
				expect(resourceRegistry.register).toHaveBeenCalledWith(publicApiResource);
				expect(strategyRegistry.register).toHaveBeenCalledTimes(1);
				expect(strategyRegistry.register).toHaveBeenCalledWith(publicApiStrategy);
			});

			it.each(['webhook', 'worker'] as const)(
				'registers neither on a %s instance, which serves no public API',
				async (instanceType) => {
					Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType }));
					resourceRegistry.register.mockClear();
					strategyRegistry.register.mockClear();

					await new InboundAuthCoreModule().init();

					expect(resourceRegistry.register).not.toHaveBeenCalled();
					expect(strategyRegistry.register).not.toHaveBeenCalled();
				},
			);
		});
	});

	it('registers itself on main, webhook and worker instances without a license flag', () => {
		const entry = Container.get(ModuleMetadata).get('inbound-auth-core');

		expect(entry).toBeDefined();
		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
		expect(entry?.licenseFlag).toBeUndefined();
	});

	it('hands the trusted source directory to nodes as its module context', async () => {
		const directory = mock<TrustedSourceDbDirectory>();
		Container.set(TrustedSourceDbDirectory, directory);
		const module: ModuleInterface = new InboundAuthCoreModule();

		expect(await module.context?.()).toEqual({ trustedSourceDirectory: directory });
	});

	it('exposes the discovery task as its only system task', async () => {
		const module: ModuleInterface = new InboundAuthCoreModule();

		expect(module.systemTasks).toBeDefined();
		expect(await module.systemTasks?.()).toEqual([TrustedSourceDiscoveryTask]);
	});

	it('exposes its entities so the datasource picks them up', async () => {
		const module = new InboundAuthCoreModule();

		const entities = (await module.entities()) as unknown as Array<{ name: string }>;

		expect(entities.map((entity) => entity.name)).toEqual([
			'TrustedSourceEntity',
			'TrustedSourceIdentityEntity',
		]);
	});
	describe('management controller', () => {
		beforeEach(() => {
			loadController.mockClear();
			vi.stubEnv(FLAG, '');
		});

		afterEach(() => {
			vi.unstubAllEnvs();
			Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType: 'main' }));
		});

		it('is not loaded while the flag is unset', async () => {
			await new InboundAuthCoreModule().init();

			expect(loadController).not.toHaveBeenCalled();
		});

		it.each(['webhook', 'worker'] as const)(
			'is not loaded on a %s instance even with the flag',
			async (instanceType) => {
				vi.stubEnv(FLAG, 'true');
				Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType }));

				await new InboundAuthCoreModule().init();

				expect(loadController).not.toHaveBeenCalled();
			},
		);

		it('is loaded on a main instance when the flag is true', async () => {
			vi.stubEnv(FLAG, 'true');

			await new InboundAuthCoreModule().init();

			expect(loadController).toHaveBeenCalledOnce();
		});
	});
});
