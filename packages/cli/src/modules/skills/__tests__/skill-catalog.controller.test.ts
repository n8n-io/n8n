import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { SkillCatalogController } from '../controllers/skill-catalog.controller';

describe('Skill catalog route access', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		SkillCatalogController as never,
	);
	it('gates every catalog route and limits requests per user', () => {
		expect([...metadata.routes.keys()].sort()).toEqual([
			'browse',
			'browseProject',
			'detail',
			'detailProject',
			'metadata',
			'metadataProject',
			'search',
			'searchProject',
		]);
		for (const [handler, route] of metadata.routes) {
			expect(route.skipAuth).toBe(false);
			expect(route.accessScope).toMatchObject({
				scope: handler.endsWith('Project') ? 'projectSkill:list' : 'skill:list',
				globalOnly: !handler.endsWith('Project'),
			});
			expect(route.keyedRateLimit).toMatchObject({
				source: 'user',
				limit: handler.startsWith('metadata') ? 60 : 30,
			});
		}
	});
});
