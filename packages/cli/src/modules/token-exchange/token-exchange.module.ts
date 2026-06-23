import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE === 'true';
}

@BackendModule({
	name: 'token-exchange',
	licenseFlag: LICENSE_FEATURES.TOKEN_EXCHANGE,
	instanceTypes: ['main'],
})
export class TokenExchangeModule implements ModuleInterface {
	async entities() {
		const { TokenExchangeJti } = await import('./database/entities/token-exchange-jti.entity');
		const { TrustedKeySourceEntity } = await import(
			'./database/entities/trusted-key-source.entity'
		);
		const { TrustedKeyEntity } = await import('./database/entities/trusted-key.entity');
		return [TokenExchangeJti, TrustedKeySourceEntity, TrustedKeyEntity] as never;
	}

	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		const { TrustedKeyService } = await import('./services/trusted-key.service');
		await Container.get(TrustedKeyService).initialize();

		await import('./controllers/token-exchange.controller');
		await import('./controllers/embed-auth.controller');

		const { JtiCleanupService } = await import('./services/jti-cleanup.service');
		Container.get(JtiCleanupService).init();

		// Register the scoped JWT auth strategy into the public API auth chain.
		// ScopedJwtStrategy runs after ApiKeyAuthStrategy (which abstains for token-exchange JWTs).
		const { ScopedJwtStrategy } = await import('./services/scoped-jwt.strategy');
		const { AuthStrategyRegistry } = await import('@/services/auth-strategy.registry');
		Container.get(AuthStrategyRegistry).register(Container.get(ScopedJwtStrategy));
	}
}
