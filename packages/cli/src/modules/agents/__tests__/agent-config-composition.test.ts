import type { Agent } from '../entities/agent.entity';
import { composeJsonConfig, decomposeJsonConfig } from '../json-config/agent-config-composition';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

describe('composeJsonConfig', () => {
	it('returns the schema with empty integrations when none are stored', () => {
		const agent = {
			schema: { name: 'A', model: 'anthropic/claude', instructions: 'x' },
			integrations: [],
		} as unknown as Agent;
		expect(composeJsonConfig(agent)).toEqual({
			name: 'A',
			model: 'anthropic/claude',
			instructions: 'x',
			integrations: [],
		});
	});

	it('merges integrations from the storage column into the JSON config', () => {
		const agent = {
			schema: { name: 'A', model: 'anthropic/claude', instructions: 'x' },
			integrations: [{ type: 'slack', credentialId: 'c1', credentialName: 'Acme' }],
		} as unknown as Agent;
		expect(composeJsonConfig(agent)?.integrations).toEqual([
			{ type: 'slack', credentialId: 'c1', credentialName: 'Acme' },
		]);
	});

	it('returns null when schema is null', () => {
		const agent = { schema: null, integrations: [] } as unknown as Agent;
		expect(composeJsonConfig(agent)).toBeNull();
	});

	it('treats a missing integrations column as an empty array', () => {
		const agent = {
			schema: { name: 'A', model: 'anthropic/claude', instructions: 'x' },
			integrations: undefined,
		} as unknown as Agent;
		expect(composeJsonConfig(agent)?.integrations).toEqual([]);
	});
});

describe('decomposeJsonConfig', () => {
	it('splits integrations away from the schema-storage payload', () => {
		const input = {
			name: 'A',
			model: 'anthropic/claude',
			instructions: 'x',
			integrations: [
				{ type: 'schedule', active: true, cronExpression: '0 9 * * *', wakeUpPrompt: 'go' },
			],
		} as unknown as AgentJsonConfig;
		const { schemaConfig, integrations } = decomposeJsonConfig(input);
		expect(schemaConfig).not.toHaveProperty('integrations');
		expect(schemaConfig.name).toBe('A');
		expect(integrations).toEqual(input.integrations);
	});

	it('defaults to an empty integrations array when missing', () => {
		const input = {
			name: 'A',
			model: 'anthropic/claude',
			instructions: 'x',
		} as unknown as AgentJsonConfig;
		const { integrations } = decomposeJsonConfig(input);
		expect(integrations).toEqual([]);
	});
});
