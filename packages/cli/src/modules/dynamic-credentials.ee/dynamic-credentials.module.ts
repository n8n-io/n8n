import { isEnvFeatureEnabled } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Superset capability: external/custom credential resolvers (OAuth/Slack) plus
 * their management surfaces and identity-extractor hooks. The base "private
 * credentials" capability is always on once the module is licensed.
 */
function isExternalResolversEnabled(): boolean {
	return isEnvFeatureEnabled('N8N_ENV_FEAT_DYNAMIC_CREDENTIALS');
}

@BackendModule({ name: 'dynamic-credentials', licenseFlag: LICENSE_FEATURES.DYNAMIC_CREDENTIALS })
export class DynamicCredentialsModule implements ModuleInterface {
	async init() {
		await import('./dynamic-credentials.controller.js');

		// System resolver powers private credentials; OAuth/Slack resolvers and
		// their management/identity-extractor surfaces are external-only.
		await import('./credential-resolvers/n8n-credential-resolver.js');
		if (isExternalResolversEnabled()) {
			await import('./credential-resolvers.controller.js');
			await import('./context-establishment-hooks/index.js');
			await import('./credential-resolvers/oauth-credential-resolver.js');
			await import('./credential-resolvers/slack-credential-resolver.js');
		}
		const {
			DynamicCredentialResolverRegistry,
			DynamicCredentialStorageService,
			DynamicCredentialService,
			N8nResolverSeeder,
			CredentialConnectionStatusService,
		} = await import('./services/index.js');
		await import('./workflow-status.controller.js');

		await Container.get(DynamicCredentialResolverRegistry).init();
		await Container.get(N8nResolverSeeder).seed();

		// Register the credential resolution provider with CredentialsHelper
		const { DynamicCredentialsProxy } = await import(
			'../../credentials/dynamic-credentials-proxy.js'
		);
		const credentialsProxy = Container.get(DynamicCredentialsProxy);
		const dynamicCredentialService = Container.get(DynamicCredentialService);
		const dynamicCredentialStorageService = Container.get(DynamicCredentialStorageService);
		credentialsProxy.setResolverProvider(dynamicCredentialService);
		credentialsProxy.setStorageProvider(dynamicCredentialStorageService);

		// Register the per-user connection status provider so the credentials
		// service can populate `connectedByMe` on responses.
		const { CredentialConnectionStatusProxy } = await import(
			'../../credentials/credential-connection-status-proxy.js'
		);
		Container.get(CredentialConnectionStatusProxy).setProvider(
			Container.get(CredentialConnectionStatusService),
		);

		// Register the executing-user identifier so the redaction layer can attribute
		// a run to its user from the established identity carrier — the same source
		// credential resolution uses.
		const { ExecutingUserIdentifierProxy } = await import(
			'../../credentials/executing-user-identifier-proxy.js'
		);
		const { N8NIdentifier } = await import('./credential-resolvers/identifiers/n8n-identifier.js');
		Container.get(ExecutingUserIdentifierProxy).setProvider(Container.get(N8NIdentifier));
	}

	async entities() {
		const { DynamicCredentialResolver } = await import(
			'./database/entities/credential-resolver.js'
		);
		const { DynamicCredentialEntry } = await import(
			'./database/entities/dynamic-credential-entry.js'
		);
		const { DynamicCredentialUserEntry } = await import(
			'./database/entities/dynamic-credential-user-entry.js'
		);

		return [DynamicCredentialResolver, DynamicCredentialEntry, DynamicCredentialUserEntry];
	}

	async context() {
		const { CredentialCheckProxyService } = await import(
			'./services/credential-check-proxy.service.js'
		);
		return { credentialCheckProxy: Container.get(CredentialCheckProxyService) };
	}

	@OnShutdown()
	async shutdown() {}
}
