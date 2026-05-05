import { AgentJsonConfigSchema, isNodeToolsEnabled } from '../json-config/agent-json-config';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

const baseConfig: AgentJsonConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('AgentJsonConfigSchema — config.nodeTools', () => {
	it('accepts a config without nodeTools', () => {
		expect(AgentJsonConfigSchema.safeParse({ ...baseConfig, config: {} }).success).toBe(true);
	});

	it('accepts nodeTools: { enabled: true }', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			config: { nodeTools: { enabled: true } },
		});
		expect(parsed.success).toBe(true);
	});

	it('accepts nodeTools: { enabled: false }', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			config: { nodeTools: { enabled: false } },
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects nodeTools without enabled', () => {
		expect(
			AgentJsonConfigSchema.safeParse({ ...baseConfig, config: { nodeTools: {} } }).success,
		).toBe(false);
	});

	it('rejects nodeTools.enabled of the wrong type', () => {
		expect(
			AgentJsonConfigSchema.safeParse({
				...baseConfig,
				config: { nodeTools: { enabled: 'yes' } },
			}).success,
		).toBe(false);
	});
});

describe('AgentJsonConfigSchema — skill refs', () => {
	it('accepts a skill ref with a valid id', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		});

		expect(parsed.success).toBe(true);
	});

	it('rejects a skill ref with an invalid id', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [{ type: 'skill', id: 'summarize notes' }],
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects skill refs inside tools', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [{ type: 'skill', id: 'summarize_notes' }],
		});

		expect(parsed.success).toBe(false);
	});
});

describe('isNodeToolsEnabled', () => {
	it('returns false when config is undefined', () => {
		expect(isNodeToolsEnabled(undefined)).toBe(false);
	});

	it('returns false when config has no nodeTools field', () => {
		expect(isNodeToolsEnabled({})).toBe(false);
	});

	it('returns false when nodeTools.enabled is false', () => {
		expect(isNodeToolsEnabled({ nodeTools: { enabled: false } })).toBe(false);
	});

	it('returns true only when nodeTools.enabled is explicitly true', () => {
		expect(isNodeToolsEnabled({ nodeTools: { enabled: true } })).toBe(true);
	});
});
