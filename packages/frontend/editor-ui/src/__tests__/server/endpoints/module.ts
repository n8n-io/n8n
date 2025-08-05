import type { Server } from 'miragejs';

export function routesForModuleSettings(server: Server) {
	server.get('/rest/module-settings', () => {
		return {};
	});
}
