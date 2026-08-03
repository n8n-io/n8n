import { buildBuilderPrompt } from '../agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../skills';

describe('Preview markdown link guidance', () => {
	const agentPreviewPath = '/projects/project-1/agents/agent-1/preview';

	it('embeds the Preview markdown link and requires it in successful-build wrap-ups', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath,
			modelRecommendationsSection: null,
		});

		expect(prompt).toContain(`[Preview](${agentPreviewPath})`);
		expect(prompt).toContain('Keep the Preview link as a relative app path');
		expect(prompt).toContain(
			'After a successful build or config change that leaves the agent ready to try',
		);
		expect(prompt).toContain(
			`include the same [Preview](${agentPreviewPath}) markdown link in your wrap-up`,
		);
	});
});

describe('setup lifecycle guidance', () => {
	it('requires explicit publishing intent after configuration', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
			modelRecommendationsSection: null,
		});
		const guidance = [prompt, ...getBuilderRuntimeSkills().map((skill) => skill.instructions)].join(
			'\n',
		);
		const legacyPublishBlockerField = ['publish', 'Blocked', 'Issues'].join('');
		const blockedWord = ['block', 'ed'].join('');
		const channelWord = ['chan', 'nel'].join('');
		const publishWord = ['pub', 'lish'].join('');
		const legacyDeferredCardClaim = ['when it reports a ', blockedWord, ' ', channelWord].join('');
		const legacyConfigureRetry = [
			'call `configure_channel` directly for that channel ',
			'as a follow-up',
		].join('');
		const legacyImplicitActivationClaim = [
			'Connecting a ',
			channelWord,
			' ',
			publishWord,
			'es the agent',
		].join('');

		expect(guidance).not.toContain(legacyPublishBlockerField);
		expect(guidance).not.toContain(legacyDeferredCardClaim);
		expect(guidance).not.toContain(legacyConfigureRetry);
		expect(guidance).not.toContain(legacyImplicitActivationClaim);
		expect(guidance).toContain(
			'Do not call `configure_channel` again after `finish_setup` handles a channel card.',
		);
		expect(prompt).toMatch(/Do not\s+auto-publish without that intent/);
	});
});
