import { createServer } from 'miragejs';
import { endpoints } from './endpoints';
import { models } from './models';
import { factories } from './factories';

export function setupServer() {
	const server = createServer({
		models,
		factories,
		seeds(server) {
			server.createList('credentialType', 8);
			server.create('user', {
				isDefaultUser: true,
			});
		},
	});

	// Set server url prefix
	server.urlPrefix = process.env.API_URL || '';

	// Enable logging
	server.logging = false;

	// Handle undefined endpoints
	server.post('/rest/:any', () => new Promise(() => {}));

	// Handle defined endpoints
	for (const endpointsFn of endpoints) {
		endpointsFn(server);
	}

	// Reset for everything else
	server.namespace = '';
	server.passthrough();

	if (server.logging) {
		console.log('Mirage database');
		console.log(server.db.dump());
	}

	return server;
}
