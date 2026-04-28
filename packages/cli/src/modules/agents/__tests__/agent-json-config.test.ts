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

describe('AgentJsonConfigSchema — skills', () => {
	it('accepts configured skills', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [
				{
					id: 'support-triage',
					name: 'Support triage',
					description: 'Classify support requests and propose next steps.',
					enabled: true,
					definition: 'Identify urgency, missing context, and the next support action.',
				},
				{
					id: 'renewal-risk',
					name: 'Renewal risk',
					enabled: false,
					definition: 'Look for renewal blockers and summarize risk signals.',
				},
			],
		});

		expect(parsed.success).toBe(true);
	});

	it.each([
		['id', { name: 'Support triage', enabled: true, definition: 'Do the task.' }],
		['name', { id: 'support-triage', enabled: true, definition: 'Do the task.' }],
		['enabled', { id: 'support-triage', name: 'Support triage', definition: 'Do the task.' }],
		['definition', { id: 'support-triage', name: 'Support triage', enabled: true }],
	])('rejects a skill missing %s', (_field, skill) => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [skill],
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects empty skill fields', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [
				{
					id: '',
					name: '',
					enabled: true,
					definition: '',
				},
			],
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
