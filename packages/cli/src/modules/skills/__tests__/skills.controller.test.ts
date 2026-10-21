import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { SkillsController } from '../skills.controller';

/**
 * The skills routes carry no scope decorator: `SkillsApiService` checks each skill row,
 * or for `newName` the create permission in the requested scope, as `create` does.
 * `creators` names only the creators of the skills that `list` would show.
 * A new route must add that check on purpose, so the set of routes is pinned here.
 */
const ROW_CHECKED_HANDLERS = ['create', 'creators', 'delete', 'get', 'list', 'newName', 'update'];

describe('SkillsController routes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		SkillsController as never,
	);

	it('has only the routes that check access for each skill', () => {
		expect([...metadata.routes.keys()].sort()).toEqual(ROW_CHECKED_HANDLERS);
	});

	it.each(ROW_CHECKED_HANDLERS)('%s needs a login and carries no route scope', (handlerName) => {
		const route = metadata.routes.get(handlerName);

		expect(route?.accessScope).toBeUndefined();
		expect(route?.skipAuth).toBe(false);
		expect(route?.allowUnauthenticated).toBe(false);
	});
});
