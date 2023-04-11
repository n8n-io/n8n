import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';

export function routesForUsers(server: Server) {
	server.get('/rest/users', (schema: AppSchema) => {
		const { models: data } = schema.all('user');

		return new Response(200, {}, { data });
	});
}
