import { AssistantSkillProviderProxy } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { HubAssistantSkillProvider } from '../hub-assistant-skill-provider.service';
import { SkillAgentsProxy, type SkillAgentsProvider } from '../skill-agents-proxy.service';
import type { SkillService } from '../skill.service';
import { SkillsModule } from '../skills.module';
import { AssistantSkillsRollout } from '../assistant-skills-rollout';

vi.mock('../skills.controller', () => ({}));

describe('SkillsModule', () => {
	beforeEach(() => Container.reset());
	afterEach(() => Container.reset());

	it.each([
		[false, false],
		[true, true],
	])(
		'gates Assistant reads across module startup (Assistant: %s)',
		async (assistantEnabled, expected) => {
			const agents = new SkillAgentsProxy();
			const postHog = mock<PostHogClient>();
			postHog.getFeatureFlagForInstance.mockResolvedValue(assistantEnabled);
			const assistantRollout = new AssistantSkillsRollout(agents, postHog);
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
			const file = {
				skillId: summary.id,
				versionId: summary.versionId,
				path: 'references/guide.md',
				content: 'Guide.',
			};
			service.readFileForAssistant.mockResolvedValue(file);
			Container.set(SkillAgentsProxy, agents);
			Container.set(AssistantSkillProviderProxy, proxy);
			Container.set(
				HubAssistantSkillProvider,
				new HubAssistantSkillProvider(assistantRollout, service),
			);

			await new SkillsModule().init();
			expect(await proxy.isEnabled()).toBe(false);
			expect(await proxy.listSkills(context)).toEqual([]);
			expect(await proxy.readSkill(context, summary.id)).toBeNull();
			expect(service.listForAssistant).not.toHaveBeenCalled();
			expect(service.readForAssistant).not.toHaveBeenCalled();
			expect(await proxy.readFile(context, summary.id, summary.versionId, file.path)).toBeNull();
			expect(service.readFileForAssistant).not.toHaveBeenCalled();

			agents.registerProvider(mock<SkillAgentsProvider>());
			expect(await proxy.isEnabled()).toBe(expected);
			expect(await proxy.listSkills(context)).toEqual(expected ? [summary] : []);
			expect(await proxy.readSkill(context, summary.id)).toEqual(expected ? content : null);
			expect(service.listForAssistant).toHaveBeenCalledTimes(expected ? 1 : 0);
			expect(service.readForAssistant).toHaveBeenCalledTimes(expected ? 1 : 0);
			expect(await proxy.readFile(context, summary.id, summary.versionId, file.path)).toEqual(
				expected ? file : null,
			);
			expect(service.readFileForAssistant).toHaveBeenCalledTimes(expected ? 1 : 0);
			if (expected) {
				expect(service.listForAssistant).toHaveBeenCalledWith(context);
				expect(service.readForAssistant).toHaveBeenCalledWith(context, summary.id, undefined);
				expect(service.readFileForAssistant).toHaveBeenCalledWith(
					context,
					summary.id,
					summary.versionId,
					file.path,
				);
			}
		},
	);
});
