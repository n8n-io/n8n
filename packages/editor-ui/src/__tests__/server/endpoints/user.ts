import { Response, Server } from 'miragejs';
import { AppSchema } from '../types';

export function routesForUsers(server: Server) {
	server.get('/rest/users', (schema: AppSchema) => {
		const { models: data } = schema.all('user');

		return new Response(200, {}, { data });
	});

	server.get('/rest/login', (schema: AppSchema) => {
		const model = schema.findBy('user', {
			isDefaultUser: true,
		});

		return new Response(200, {}, { data: model?.attrs });
	});
}
