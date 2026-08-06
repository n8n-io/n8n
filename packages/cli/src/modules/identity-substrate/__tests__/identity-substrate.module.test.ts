import { LICENSE_FEATURES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';
import { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';
import { TrustedKeySourceRegistrationProxy } from '@/services/trusted-key-source-registration-proxy.service';

import { IdentitySubstrateModule } from '../identity-substrate.module';
import { ExternalTokenVerifierService } from '../services/external-token-verifier.service';
import { IdentityResolutionService } from '../services/identity-resolution.service';
import { JtiCleanupService } from '../services/jti-cleanup.service';
import { TrustedKeySyncService } from '../services/trusted-key-sync.service';

// Captured before any test runs `Container.reset()` (which would otherwise
// wipe the `@BackendModule` decorator's one-time registration).
const moduleEntry = Container.get(ModuleMetadata).get('identity-substrate');

describe('IdentitySubstrateModule registration', () => {
	it('declares instanceTypes for main, worker, and webhook', () => {
		expect(moduleEntry?.instanceTypes).toEqual(['main', 'worker', 'webhook']);
	});

	it('declares an OR licenseFlag array covering both the substrate and legacy token-exchange features', () => {
		expect(moduleEntry?.licenseFlag).toEqual([
			LICENSE_FEATURES.IDENTITY_SUBSTRATE,
			LICENSE_FEATURES.TOKEN_EXCHANGE,
		]);
	});
});

describe('IdentitySubstrateModule', () => {
	let externalTokenVerifierService: ReturnType<typeof mock<ExternalTokenVerifierService>>;
	let identityResolutionService: ReturnType<typeof mock<IdentityResolutionService>>;
	let trustedKeySyncService: ReturnType<typeof mock<TrustedKeySyncService>>;
	let jtiCleanupService: ReturnType<typeof mock<JtiCleanupService>>;
	let instanceSettings: ReturnType<typeof mock<InstanceSettings>>;

	let externalTokenVerifierProxy: ExternalTokenVerifierProxy;
	let identityResolutionProxy: IdentityResolutionProxy;
	let trustedKeySourceRegistrationProxy: TrustedKeySourceRegistrationProxy;

	let moduleInstance: IdentitySubstrateModule;

	beforeEach(() => {
		Container.reset();

		externalTokenVerifierService = mock<ExternalTokenVerifierService>();
		identityResolutionService = mock<IdentityResolutionService>();
		trustedKeySyncService = mock<TrustedKeySyncService>();
		jtiCleanupService = mock<JtiCleanupService>();

		Container.set(ExternalTokenVerifierService, externalTokenVerifierService);
		Container.set(IdentityResolutionService, identityResolutionService);
		Container.set(TrustedKeySyncService, trustedKeySyncService);
		Container.set(JtiCleanupService, jtiCleanupService);

		// Real proxies: cheap value objects, and the whole point of this test
		// is to observe whether *they* got a provider registered.
		externalTokenVerifierProxy = new ExternalTokenVerifierProxy();
		identityResolutionProxy = new IdentityResolutionProxy();
		trustedKeySourceRegistrationProxy = new TrustedKeySourceRegistrationProxy();
		Container.set(ExternalTokenVerifierProxy, externalTokenVerifierProxy);
		Container.set(IdentityResolutionProxy, identityResolutionProxy);
		Container.set(TrustedKeySourceRegistrationProxy, trustedKeySourceRegistrationProxy);

		moduleInstance = new IdentitySubstrateModule();
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE;
		delete process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE;
	});

	function setInstanceType(instanceType: 'main' | 'worker' | 'webhook') {
		instanceSettings = mock<InstanceSettings>({ instanceType });
		Container.set(InstanceSettings, instanceSettings);
	}

	describe('init() feature flag gate', () => {
		it('is a no-op when neither N8N_ENV_FEAT_IDENTITY_SUBSTRATE nor N8N_ENV_FEAT_TOKEN_EXCHANGE is set', async () => {
			setInstanceType('main');

			await moduleInstance.init();

			await expect(
				externalTokenVerifierProxy.verifyExternalToken('t', 'aud'),
			).resolves.toMatchObject({
				context: { reason: 'verifier_not_registered' },
			});
			expect(trustedKeySyncService.initialize).not.toHaveBeenCalled();
		});

		it('proceeds when only the legacy N8N_ENV_FEAT_TOKEN_EXCHANGE flag is set (additive-migration story)', async () => {
			process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE = 'true';
			setInstanceType('main');

			await moduleInstance.init();

			expect(trustedKeySyncService.initialize).toHaveBeenCalled();
		});
	});

	describe('init() on instanceType: worker', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE = 'true';
			setInstanceType('worker');
		});

		it('registers the ExternalTokenVerifierProxy provider', async () => {
			externalTokenVerifierService.verifyExternalToken.mockResolvedValue({
				claim: {
					sourceId: 's',
					issuer: 'iss',
					subject: 'sub',
					audience: 'aud',
					attributes: {},
					expiresAt: new Date(),
				},
			});

			await moduleInstance.init();

			const result = await externalTokenVerifierProxy.verifyExternalToken('token', 'aud');
			expect(result.claim).not.toBeNull();
			expect(externalTokenVerifierService.verifyExternalToken).toHaveBeenCalledWith('token', 'aud');
		});

		it('registers the IdentityResolutionProxy provider', async () => {
			await moduleInstance.init();

			await identityResolutionProxy.resolve(
				{ iss: 'iss', sub: 'sub' },
				undefined,
				{ issuer: 'iss' },
				false,
			);

			expect(identityResolutionService.resolve).toHaveBeenCalled();
		});

		it('never calls the write/refresh lifecycle (TrustedKeySyncService.initialize)', async () => {
			await moduleInstance.init();

			expect(trustedKeySyncService.initialize).not.toHaveBeenCalled();
		});

		it('never registers the TrustedKeySourceRegistrationProxy provider (registerFromDiscovery stays a no-op)', async () => {
			await moduleInstance.init();

			await trustedKeySourceRegistrationProxy.registerFromDiscovery('iss', 'https://jwks');

			expect(trustedKeySyncService.registerSsoDerivedSource).not.toHaveBeenCalled();
		});

		it('never calls JtiCleanupService.init', async () => {
			await moduleInstance.init();

			expect(jtiCleanupService.init).not.toHaveBeenCalled();
		});
	});

	describe('init() on instanceType: webhook', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE = 'true';
			setInstanceType('webhook');
		});

		it('registers the read-path proxies but never runs the write/refresh lifecycle', async () => {
			await moduleInstance.init();

			await externalTokenVerifierProxy.verifyExternalToken('token', 'aud');
			expect(externalTokenVerifierService.verifyExternalToken).toHaveBeenCalled();
			expect(trustedKeySyncService.initialize).not.toHaveBeenCalled();
			expect(jtiCleanupService.init).not.toHaveBeenCalled();
		});
	});

	describe('init() on instanceType: main', () => {
		beforeEach(() => {
			process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE = 'true';
			setInstanceType('main');
		});

		it('runs the write/refresh lifecycle', async () => {
			await moduleInstance.init();

			expect(trustedKeySyncService.initialize).toHaveBeenCalled();
		});

		it('registers the TrustedKeySourceRegistrationProxy provider, wired to TrustedKeySyncService', async () => {
			await moduleInstance.init();

			await trustedKeySourceRegistrationProxy.registerFromDiscovery(
				'https://idp.example.com',
				'https://idp.example.com/.well-known/jwks.json',
			);

			expect(trustedKeySyncService.registerSsoDerivedSource).toHaveBeenCalledWith(
				'https://idp.example.com',
				'https://idp.example.com/.well-known/jwks.json',
			);
		});

		it('calls JtiCleanupService.init', async () => {
			await moduleInstance.init();

			expect(jtiCleanupService.init).toHaveBeenCalled();
		});
	});
});
