import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import type { AppSchema } from '../types';
import { defaultSettings } from '../../defaults';

export function routesForSettings(server: Server) {
	server.get('/rest/settings', (schema: AppSchema) => {
		return new Response(
			200,
			{},
			{
				data: defaultSettings,
			},
		);
	});
}
