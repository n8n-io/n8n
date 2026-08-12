import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ProjectFilesController } from '../project-files.controller';

/**
 * Guards the RBAC gate on every route: a new endpoint added without an access
 * scope is an IDOR, so this fails rather than letting one slip through.
 *
 * There are no unauthenticated routes on this controller. If one is ever added,
 * list its handler name here and explain the alternate authentication.
 */
const UNAUTHENTICATED_HANDLERS = new Set<string>();

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	ProjectFilesController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('ProjectFilesController route access scopes', () => {
	it('registers every expected route', () => {
		expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual([
			'deleteFile',
			'downloadFile',
			'listFiles',
			'renameFile',
			'uploadFile',
		]);
	});

	it.each(routeCases)(
		'$handlerName is gated by a project-scoped projectFile:* check',
		({ handlerName, route }) => {
			if (UNAUTHENTICATED_HANDLERS.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				expect(route.skipAuth).toBe(true);
				return;
			}

			expect(route.accessScope).toBeDefined();
			// Project-scoped, never global-only: every route is nested under
			// :projectId, so access must be resolvable from the project.
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('projectFile:')).toBe(true);
		},
	);

	it('uses the project-scoped list scope, not the instance-wide one', () => {
		// `projectFile:list` is reserved for a future cross-project overview route;
		// a project-scoped list must use `listProject`, mirroring dataTable.
		const listRoute = routeCases.find(({ handlerName }) => handlerName === 'listFiles');

		expect(listRoute?.route.accessScope?.scope).toBe('projectFile:listProject');
	});
});
