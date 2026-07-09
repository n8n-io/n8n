import { createServer } from 'miragejs';
import { endpoints } from './endpoints';
import { models } from './models';
import { factories } from './factories';
import { fixtures } from './fixtures';

export function setupServer() {
	const server = createServer({
		models,
		factories,
		fixtures,
		seeds(server) {
			server.loadFixtures('tags', 'workflows');
			server.createList('credentialType', 8);
			server.create('user', {
				firstName: 'Nathan',
				lastName: 'Doe',
				isDefaultUser: true,
			});
		},
	});

	// Set server url prefix
	server.urlPrefix = process.env.API_URL || '';

	// Enable logging
	server.logging = false;

	// Handle defined endpoints
	for (const endpointsFn of endpoints) {
		endpointsFn(server);
	}

	// Handle undefined endpoints
	server.post('/rest/:any', async () => ({}));

	server.namespace = '';
	// Intentionally no `server.passthrough()` here: in tests we never want
	// mirage to fall through to the real network. Unmatched requests return
	// mirage's default 404 in-memory.

	if (server.logging) {
		console.log('Mirage database');
		console.log(server.db.dump());
	}

	return server;
}
