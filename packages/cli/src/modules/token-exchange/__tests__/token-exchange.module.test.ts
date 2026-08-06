import type { LicenseState } from '@n8n/backend-common';
import { ModuleRegistry } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { IdentitySubstrateModule } from '@/modules/identity-substrate/identity-substrate.module';

import { TokenExchangeModule } from '../token-exchange.module';

// Captured at import time, before any test mutates Container state - this is
// the one-time side effect of the `@BackendModule` decorator running.
const moduleEntry = Container.get(ModuleMetadata).get('token-exchange');

describe('TokenExchangeModule registration', () => {
	it('stays instanceTypes: main-only after the identity-substrate split', () => {
		expect(moduleEntry?.instanceTypes).toEqual(['main']);
	});

	it('keeps the TOKEN_EXCHANGE licenseFlag unchanged (not widened to an array)', () => {
		expect(moduleEntry?.licenseFlag).toBe(LICENSE_FEATURES.TOKEN_EXCHANGE);
	});
});

describe('TokenExchangeModule', () => {
	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE;
	});

	it('init() is a no-op when the feature flag is off', async () => {
		await expect(new TokenExchangeModule().init()).resolves.toBeUndefined();
	});

	// Regression test: before the split, TokenExchangeModule bundled the
	// verifier that inbound-IdP-protected webhooks/workers need. Now that the
	// verifier lives in `identity-substrate` (instanceTypes: main/worker/
	// webhook), this locks in that the RFC 8693/embed-auth consumer itself
	// still never runs on a worker - no accidental widening back.
	it('is never initialized on a worker, even when every module is licensed', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);
		const licenseState = mock<LicenseState>({ isLicensed: () => true });
		const registry = new ModuleRegistry(moduleMetadata, licenseState, mock(), mock());

		const tokenExchangeInitSpy = vi.spyOn(TokenExchangeModule.prototype, 'init');
		const identitySubstrateInitSpy = vi.spyOn(IdentitySubstrateModule.prototype, 'init');

		try {
			await registry.initModules('worker');

			expect(tokenExchangeInitSpy).not.toHaveBeenCalled();
			// Sanity check that the registry really did process this module set -
			// identity-substrate (instanceTypes: main/worker/webhook) should have
			// been reached, proving `not.toHaveBeenCalled()` above reflects the
			// instanceTypes gate, not an empty/no-op registry run.
			expect(identitySubstrateInitSpy).toHaveBeenCalled();
		} finally {
			tokenExchangeInitSpy.mockRestore();
			identitySubstrateInitSpy.mockRestore();
		}
	});
});
