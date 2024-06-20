import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';

export function routesForCredentials(server: Server) {
	server.get('/rest/credentials', (schema: AppSchema) => {
		const { models: data } = schema.all('credential');

		return new Response(200, {}, { data });
	});
}
