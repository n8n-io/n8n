import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import '../oauth-server.module';

describe('OAuthServerModule', () => {
	it('initializes on main, webhook and worker instances so the token verifier is available wherever credentials resolve (incl. queue-mode workers)', () => {
		const entry = Container.get(ModuleMetadata).get('oauth-server');

		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
	});
});
