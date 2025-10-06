import type { Request, Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';
import { jsonParse } from 'n8n-workflow';
import type { EnvironmentVariable } from '@/features/environments.ee/environments.types';

export function routesForVariables(server: Server) {
	server.get('/rest/variables', (schema: AppSchema) => {
		const { models: data } = schema.all('variable');

		return new Response(200, {}, { data });
	});

	server.post('/rest/variables', (schema: AppSchema, request: Request) => {
		const data = schema.create('variable', jsonParse(request.requestBody));

		return new Response(200, {}, { data });
	});

	server.patch('/rest/variables/:id', (schema: AppSchema, request: Request) => {
		const data: EnvironmentVariable = jsonParse(request.requestBody);
		const id = request.params.id;

		const model = schema.find('variable', id);
		if (model) {
			model.update(data);
		}

		return new Response(200, {}, { data: model?.attrs });
	});

	server.delete('/rest/variables/:id', (schema: AppSchema, request: Request) => {
		const id = request.params.id;

		const model = schema.find('variable', id);
		if (model) {
			model.destroy();
		}

		return new Response(200, {}, {});
	});
}
