import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Skills with their saved versions, the REST API of the settings page, and the services
 * that agents, MCP and n8n Assistant use to read and write skills. It does not import the
 * agents module: agents registers its `SkillUsage` on init.
 */
@BackendModule({ name: 'skills' })
export class SkillsModule implements ModuleInterface {
	async init() {
		await import('./controllers/skills.controller.js');
	}

	async entities() {
		const { Skill } = await import('./database/entities/skill.entity.js');
		const { SkillVersion } = await import('./database/entities/skill-version.entity.js');
		const { SkillFile } = await import('./database/entities/skill-file.entity.js');

		return [Skill, SkillVersion, SkillFile];
	}
}
