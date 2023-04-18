import { Response, Server } from 'miragejs';
import { AppSchema } from '../types';

export function routesForCredentialTypes(server: Server) {
	server.get('/types/credentials.json', (schema: AppSchema) => {
		const { models: data } = schema.all('credentialType');

		return new Response(200, {}, data);
	});
}
