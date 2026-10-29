import type { Logger } from '@n8n/backend-common';
import { AssistantSkillProviderProxy } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { PostHogClient } from '@/posthog';

import { HubAssistantSkillProvider } from '../hub-assistant-skill-provider.service';
import { SkillAgentsProxy, type SkillAgentsProvider } from '../skill-agents-proxy.service';
import type { SkillService } from '../skill.service';
import { SkillsHubRollout } from '../skills-hub-rollout';
import { SkillsModule } from '../skills.module';
import { AssistantSkillsRollout } from '../assistant-skills-rollout';

vi.mock('../skills.controller', () => ({}));

describe('SkillsModule', () => {
	beforeEach(() => Container.reset());
	afterEach(() => Container.reset());

	it.each([
		[false, true, false],
		[true, false, false],
		[true, true, true],
	])(
		'gates Assistant reads across module startup (Hub: %s, Assistant: %s)',
		async (hubEnabled, assistantEnabled, expected) => {
			const config = new AgentsConfig();
			config.skillsHubEnabled = hubEnabled;
			const agents = new SkillAgentsProxy();
			const rollout = new SkillsHubRollout(config, mock<Logger>(), agents);
			const postHog = mock<PostHogClient>();
			postHog.getFeatureFlagForInstance.mockResolvedValue(assistantEnabled);
			const assistantRollout = new AssistantSkillsRollout(rollout, postHog);
			const service = mock<SkillService>();
			const proxy = new AssistantSkillProviderProxy();
			const context = { user: mock<User>() };
			const summary = {
				id: 'skill-1',
				projectId: null,
				name: 'Tone',
				description: 'Writing style',
				versionId: 'version-1',
				version: 1,
			};
			const content = { ...summary, instructions: 'Be brief.', frontmatter: null, files: [] };
			service.listForAssistant.mockResolvedValue([summary]);
			service.readForAssistant.mockResolvedValue(content);
			Container.set(SkillsHubRollout, rollout);
			Container.set(AssistantSkillProviderProxy, proxy);
			Container.set(
				HubAssistantSkillProvider,
				new HubAssistantSkillProvider(assistantRollout, service),
			);

			await new SkillsModule().init();
			expect(await proxy.listSkills(context)).toEqual([]);
			expect(await proxy.readSkill(context, summary.id)).toBeNull();
			expect(service.listForAssistant).not.toHaveBeenCalled();
			expect(service.readForAssistant).not.toHaveBeenCalled();

			agents.registerProvider(mock<SkillAgentsProvider>());
			expect(await proxy.listSkills(context)).toEqual(expected ? [summary] : []);
			expect(await proxy.readSkill(context, summary.id)).toEqual(expected ? content : null);
			expect(service.listForAssistant).toHaveBeenCalledTimes(expected ? 1 : 0);
			expect(service.readForAssistant).toHaveBeenCalledTimes(expected ? 1 : 0);
			if (expected) {
				expect(service.listForAssistant).toHaveBeenCalledWith(context);
				expect(service.readForAssistant).toHaveBeenCalledWith(context, summary.id);
			}
		},
	);
});
