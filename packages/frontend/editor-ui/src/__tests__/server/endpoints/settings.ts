import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import { defaultSettings } from '../../defaults';

export function routesForSettings(server: Server) {
	server.get('/rest/settings', () => {
		return new Response(
			200,
			{},
			{
				data: defaultSettings,
			},
		);
	});
}
