import { buildBuilderPrompt } from '../agents-builder-prompts';

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
