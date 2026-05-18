import { AgentJsonConfigSchema } from '@n8n/api-types';

import { buildBuilderPrompt, MEMORY_PRESETS_SECTION } from '../builder/agents-builder-prompts';

const baseConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('agents builder prompt', () => {
	it('only documents memory storage values accepted by the JSON config schema', () => {
		expect(
			AgentJsonConfigSchema.safeParse({
				...baseConfig,
				memory: { enabled: true, storage: 'n8n' },
			}).success,
		).toBe(true);

		for (const storage of ['sqlite', 'postgres']) {
			expect(
				AgentJsonConfigSchema.safeParse({
					...baseConfig,
					memory: { enabled: true, storage },
				}).success,
			).toBe(false);
			expect(MEMORY_PRESETS_SECTION).not.toContain(`| ${storage}`);
		}
		expect(MEMORY_PRESETS_SECTION).not.toContain('connection.path');
		expect(MEMORY_PRESETS_SECTION).not.toContain('connection.credential');
	});

	it('describes observation-log memory', () => {
		expect(MEMORY_PRESETS_SECTION).toContain('observation log');
		expect(MEMORY_PRESETS_SECTION).toContain('renderTokenBudget');
	});

	it('documents task tools for scheduled objectives', () => {
		const prompt = buildBuilderPrompt({
			configJson: JSON.stringify(baseConfig),
			configHash: null,
			configUpdatedAt: null,
			toolList: '(none)',
			modelRecommendationsSection: null,
		});

		expect(prompt).toContain('## Tasks');
		expect(prompt).toContain('create_task');
		expect(prompt).toContain('list_tasks');
		expect(prompt).toContain('update_task');
		expect(prompt).toContain('inactive unless the user explicitly asks to activate');
		expect(prompt).not.toContain('Scheduled objectives are configured as Tasks in the UI');
	});
});
