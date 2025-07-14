import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';

export function routesForWorkflows(server: Server) {
	server.get('/rest/workflows', (schema: AppSchema) => {
		const { models: data } = schema.all('workflow');

		return new Response(200, {}, { data });
	});
	server.get('/rest/active-workflows', (schema: AppSchema) => {
		const { models: data } = schema.all('workflow');

		return new Response(200, {}, { data });
	});
}
