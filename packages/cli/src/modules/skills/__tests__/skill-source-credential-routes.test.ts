import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import {
	ProjectSkillSourceCredentialController,
	SkillSourceController,
} from '../controllers/skill-source.controller';

describe('Source credential route scopes', () => {
	const registry = Container.get(ControllerRegistryMetadata);
	const projectRoutes = registry.getControllerMetadata(
		ProjectSkillSourceCredentialController,
	).routes;
	const globalRoutes = registry.getControllerMetadata(SkillSourceController).routes;

	it.each([...projectRoutes.entries()])(
		'gates project handler %s by project skill update permission',
		(_handler, route) => {
			expect(route.accessScope).toEqual({ scope: 'projectSkill:update', globalOnly: false });
		},
	);

	it.each(['replaceCredential', 'replacementCredentials'])(
		'gates Global handler %s by instance skill update permission',
		(handler) => {
			expect(globalRoutes.get(handler)?.accessScope).toEqual({
				scope: 'skill:update',
				globalOnly: true,
			});
		},
	);
});
