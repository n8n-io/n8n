import { AgentJsonConfigSchema } from '@n8n/api-types';

import {
	getSchemaReferenceSection,
	MEMORY_PRESETS_SECTION,
} from '../builder/agents-builder-prompts';

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

	it('describes episodic memory credential selection', () => {
		expect(MEMORY_PRESETS_SECTION).toContain('Episodic Memory');
		expect(MEMORY_PRESETS_SECTION).toContain('memory.episodicMemory');
		expect(MEMORY_PRESETS_SECTION).toContain('ask_credential');
		expect(MEMORY_PRESETS_SECTION).toContain('openAiApi');
		expect(getSchemaReferenceSection()).toContain('episodicMemory');
	});
});
