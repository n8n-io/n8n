import { CredentialsResolverProxyService } from '@/credentials/credentials-resolver-proxy.service';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'resolver-credentials' })
export class ResolverCredentialsModule implements ModuleInterface {
	async init() {
		const { LifecycleService } = await import('./lifecycle.sevice');
		const { CredentialResolverService } = await import('./credential-resolver.service');

		await import('./resolver-credential.controller');

		Container.get(CredentialsResolverProxyService).setCredentialsResolverService(
			Container.get(CredentialResolverService),
		);

		const lifecycleService = Container.get(LifecycleService);

		lifecycleService.init();
	}

	@OnShutdown()
	async shutdown() {}
}
