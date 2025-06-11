import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@N8nModule()
export class ExternalSecretsModule implements BaseN8nModule {
	async init() {
		const { ExternalSecretsInit } = await import('./external-secrets.init');
		await Container.get(ExternalSecretsInit).init();
	}
}
