import type { Logger } from '@n8n/backend-common';
import { AssistantSkillProviderProxy, type ProjectScopeService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { PostHogClient } from '@/posthog';

import { HubAssistantSkillProvider } from '../hub-assistant-skill-provider.service';
import { SkillAgentsProxy, type SkillAgentsProvider } from '../skill-agents-proxy.service';
import type { SkillRepository } from '../skill.repository';
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
			const repository = mock<SkillRepository>();
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
			repository.findAssistantSkillSummaries.mockResolvedValue([summary]);
			Container.set(SkillsHubRollout, rollout);
			Container.set(AssistantSkillProviderProxy, proxy);
			Container.set(
				HubAssistantSkillProvider,
				new HubAssistantSkillProvider(
					assistantRollout,
					mock<ProjectScopeService>(),
					repository,
					service,
				),
			);

			await new SkillsModule().init();
			expect(await proxy.listSkills(context)).toEqual([]);
			expect(repository.findAssistantSkillSummaries).not.toHaveBeenCalled();

			agents.registerProvider(mock<SkillAgentsProvider>());
			expect(await proxy.listSkills(context)).toEqual(expected ? [summary] : []);
			expect(repository.findAssistantSkillSummaries).toHaveBeenCalledTimes(expected ? 1 : 0);
		},
	);
});
