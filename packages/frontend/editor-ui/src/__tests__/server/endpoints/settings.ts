import type { Server } from 'miragejs';
import { Response } from 'miragejs';
import { defaultSettings } from '@n8n/frontend-test-utils';

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
