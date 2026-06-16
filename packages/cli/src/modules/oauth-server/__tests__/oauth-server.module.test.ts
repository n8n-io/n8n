import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import '../oauth-server.module';

describe('OAuthServerModule', () => {
	it('initializes on both main and webhook instances so the token verifier is available in queue mode', () => {
		const entry = Container.get(ModuleMetadata).get('oauth-server');

		expect(entry?.instanceTypes).toEqual(['main', 'webhook']);
	});
});
