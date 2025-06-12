import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';

export function routesForTags(server: Server) {
	server.get('/rest/tags', (schema: AppSchema) => {
		const { models: data } = schema.all('tag');

		return new Response(200, {}, { data });
	});
}
