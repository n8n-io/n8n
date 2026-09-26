import { AGENT_UI_LABELS_SECTION, buildAgentBuilderGuide } from '../agents-builder-prompts';

function buildGuide() {
	return buildAgentBuilderGuide({ modelRecommendationsSection: null });
}

describe('buildAgentBuilderGuide', () => {
	it('teaches the Sessions tab labels after conversation-mode guidance', () => {
		const guide = buildGuide();

		expect(guide).toContain('## Agent UI labels');
		expect(guide).toContain('Sessions tab');
		expect(guide).toContain('Never tell the user to open a Runs tab');
		expect(guide).toContain('Workflow execution history stays "Executions"');
		expect(guide).toContain('Do not invent a Sessions URL');
		expect(guide).toContain('Scheduled tasks inherit these instructions');
		expect(guide).not.toContain('Scheduled runs inherit');

		const conversationModeIndex = guide.indexOf('When To Build vs When To Converse');
		const uiLabelsIndex = guide.indexOf(AGENT_UI_LABELS_SECTION);
		expect(conversationModeIndex).toBeGreaterThan(-1);
		expect(uiLabelsIndex).toBeGreaterThan(conversationModeIndex);
	});
});
