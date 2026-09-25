import { AGENT_UI_LABELS_SECTION, buildBuilderPrompt } from '../agents-builder-prompts';

function buildPrompt() {
	return buildBuilderPrompt({
		agentPreviewPath: '/projects/p1/agents/a1?openPreview=true',
		modelRecommendationsSection: null,
	});
}

describe('buildBuilderPrompt', () => {
	it('teaches the builder the Sessions tab labels after conversation-mode guidance', () => {
		const prompt = buildPrompt();

		expect(prompt).toContain('## Agent UI labels');
		expect(prompt).toContain('Sessions tab');
		expect(prompt).toContain('Never tell the user to open a Runs tab');
		expect(prompt).toContain('Workflow execution history stays "Executions"');
		expect(prompt).toContain('Do not invent a Sessions URL');
		expect(prompt).toContain('Scheduled tasks inherit these instructions');
		expect(prompt).not.toContain('Scheduled runs inherit');

		const conversationModeIndex = prompt.indexOf('When To Build vs When To Converse');
		const uiLabelsIndex = prompt.indexOf(AGENT_UI_LABELS_SECTION);
		expect(conversationModeIndex).toBeGreaterThan(-1);
		expect(uiLabelsIndex).toBeGreaterThan(conversationModeIndex);
	});
});
