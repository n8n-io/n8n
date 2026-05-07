import { MEMORY_PRESETS_SECTION } from '../builder/agents-builder-prompts';
import { AgentJsonConfigSchema } from '../json-config/agent-json-config';

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
});
