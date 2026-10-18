import {
	AGENT_UI_LABELS_SECTION,
	buildBuilderPrompt,
	buildBuilderSessionContext,
} from '../agents-builder-prompts';

describe('buildBuilderPrompt', () => {
	it('teaches the builder the Sessions tab labels after conversation-mode guidance', () => {
		const prompt = buildBuilderPrompt();

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

	it('stays free of per-agent and per-process values so builds share one cached prompt', () => {
		const prompt = buildBuilderPrompt();

		expect(buildBuilderPrompt()).toBe(prompt);
		expect(prompt).not.toContain('/projects/');
		expect(prompt).not.toContain('### Recommended LLM Models');
		expect(prompt).toContain('Preview link from the Session context');
	});
});

describe('buildBuilderSessionContext', () => {
	it('carries the agent Preview link', () => {
		const context = buildBuilderSessionContext({
			agentPreviewPath: '/projects/p1/agents/a1?openPreview=true',
			modelRecommendationsSection: null,
		});

		expect(context).toContain('## Session context');
		expect(context).toContain('[Preview](/projects/p1/agents/a1?openPreview=true)');
	});

	it('includes the model recommendations, or the no-recommendations rule when absent', () => {
		const withSection = buildBuilderSessionContext({
			agentPreviewPath: '/p',
			modelRecommendationsSection: '### Recommended LLM Models\n\n- Anthropic: x',
		});
		const withoutSection = buildBuilderSessionContext({
			agentPreviewPath: '/p',
			modelRecommendationsSection: null,
		});

		expect(withSection).toContain('### Recommended LLM Models');
		expect(withSection).not.toContain('do not recommend or name');
		expect(withoutSection).not.toContain('### Recommended LLM Models');
		expect(withoutSection).toContain('do not recommend or name');
	});
});
