import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';

export function routesForCredentialTypes(server: Server) {
	server.get('/types/credentials.json', (schema: AppSchema) => {
		const { models: data } = schema.all('credentialType');

		return new Response(200, {}, data);
	});
}
