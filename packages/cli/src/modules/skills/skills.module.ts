import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Skills with their saved versions, the REST API of the settings page, and the services
 * that agents, MCP and n8n Assistant use to read and write skills. It does not import the
 * agents module: agents registers a `SkillAgentsProvider` on init.
 */
@BackendModule({ name: 'skills' })
export class SkillsModule implements ModuleInterface {
	async init() {
		// The agents module registers its provider later, so check it on each Assistant read.
		const { AssistantSkillProviderProxy } = await import('@n8n/backend-services');
		const { HubAssistantSkillProvider } = await import(
			'./services/hub-assistant-skill-provider.service.js'
		);
		Container.get(AssistantSkillProviderProxy).registerProvider(
			Container.get(HubAssistantSkillProvider),
		);

		await import('./controllers/skills.controller.js');
	}

	async entities() {
		const { Skill } = await import('./database/entities/skill.entity.js');
		const { SkillVersion } = await import('./database/entities/skill-version.entity.js');
		const { SkillFile } = await import('./database/entities/skill-file.entity.js');

		return [Skill, SkillVersion, SkillFile];
	}
}
