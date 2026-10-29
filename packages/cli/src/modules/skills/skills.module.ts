import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Skills with their saved versions, the REST API of the settings page, and the services
 * that agents, MCP and n8n Assistant use to read and write skills. It does not import the
 * agents module: agents registers its `SkillUsage` on init.
 */
@BackendModule({ name: 'skills' })
export class SkillsModule implements ModuleInterface {
	async init() {
		await import('./controllers/skills.controller.js');
		await import('./controllers/skill-source.controller.js');

		const { SkillSourceClientRegistry } = await import(
			'./sources/skill-source-client-registry.service.js'
		);
		const { GitHubSkillSourceClient } = await import(
			'./sources/github/github-skill-source-client.js'
		);
		Container.get(SkillSourceClientRegistry).register(Container.get(GitHubSkillSourceClient));
	}

	async entities() {
		const { Skill } = await import('./database/entities/skill.entity.js');
		const { SkillVersion } = await import('./database/entities/skill-version.entity.js');
		const { SkillFile } = await import('./database/entities/skill-file.entity.js');
		const { SkillSourceConnection } = await import(
			'./database/entities/skill-source-connection.entity.js'
		);
		const { SkillSourceLink } = await import('./database/entities/skill-source-link.entity.js');

		return [Skill, SkillVersion, SkillFile, SkillSourceConnection, SkillSourceLink];
	}
}
