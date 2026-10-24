import { AssistantSkillProviderProxy } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { HubAssistantSkillProvider } from '../services/hub-assistant-skill-provider.service';
import { SkillUsageProxy } from '../services/skill-usage-proxy.service';
import type { SkillUsage } from '../services/skill-usage.contracts';
import { SkillsGate } from '../services/skills-gate';
import type { SkillService } from '../services/skill.service';
import { SkillsModule } from '../skills.module';
import { AssistantSkillsFlagGate } from '../services/assistant-skills-flag-gate';

vi.mock('../controllers/skills.controller', () => ({}));

describe('SkillsModule', () => {
	beforeEach(() => Container.reset());
	afterEach(() => Container.reset());

	it.each([
		[false, false],
		[true, true],
	])(
		'gates Assistant reads across module startup (Assistant: %s)',
		async (assistantEnabled, expected) => {
			const agents = new SkillUsageProxy();
			const postHog = mock<PostHogClient>();
			postHog.getFeatureFlagForInstance.mockResolvedValue(assistantEnabled);
			const assistantRollout = new AssistantSkillsFlagGate(new SkillsGate(agents), postHog);
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
			Container.set(SkillUsageProxy, agents);
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

			agents.register(mock<SkillUsage>());
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
