import { AgentJsonConfigSchema } from '../agent-json-config.schema';
import { sanitizeAgentJsonConfig } from '../sanitize-agent-json-config';

const baseConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('sanitizeAgentJsonConfig', () => {
	it('returns non-object payloads unchanged', () => {
		expect(sanitizeAgentJsonConfig(null)).toBe(null);
		expect(sanitizeAgentJsonConfig('config')).toBe('config');
		expect(sanitizeAgentJsonConfig([])).toEqual([]);
	});

	it('leaves a clean config unchanged', () => {
		const config = {
			...baseConfig,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
			tools: [{ type: 'custom', id: 'my_tool' }],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
	});

	it('strips unsupported integration types such as the removed schedule integration', () => {
		const config = {
			...baseConfig,
			integrations: [
				{ type: 'schedule', active: false, cronExpression: '0 8 * * 1' },
				{ type: 'slack', credentialId: 'cred-slack' },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		});
	});

	it('strips unsupported tool types while keeping supported ones', () => {
		const config = {
			...baseConfig,
			tools: [
				{ type: 'legacy_tool', id: 'old' },
				{ type: 'custom', id: 'my_tool' },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			tools: [{ type: 'custom', id: 'my_tool' }],
		});
	});

	it('keeps known integration types with invalid required fields so validation can fail', () => {
		const config = {
			...baseConfig,
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings: { accessMode: 'private', allowedUsers: [] },
				},
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
		expect(AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(config)).success).toBe(false);
	});

	it('sanitizes a realistic legacy agent config and leaves the remainder schema-valid', () => {
		const legacyConfig = {
			name: 'General Purpose Agent',
			model: 'openai/gpt-5.5',
			instructions: 'You are a helpful assistant.',
			tools: [],
			skills: [],
			credential: '14YEs5SRPfAflDJG',
			memory: {
				enabled: true,
				storage: 'n8n',
				observationalMemory: { enabled: true },
			},
			providerTools: {
				'openai.web_search': {
					externalWebAccess: true,
					searchContextSize: 'medium',
				},
			},
			config: {
				webSearch: { enabled: true },
			},
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 8 * * 1',
					wakeUpPrompt: 'Check priorities for the week.',
				},
			],
			legacyTopLevelField: 'should survive until schema parse',
		};

		const sanitized = sanitizeAgentJsonConfig(legacyConfig);
		expect(sanitized).toMatchObject({
			...legacyConfig,
			integrations: [],
			legacyTopLevelField: 'should survive until schema parse',
		});

		const parsed = AgentJsonConfigSchema.safeParse(sanitized);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.data.integrations).toEqual([]);
		expect(parsed.data).not.toHaveProperty('legacyTopLevelField');
	});

	it('strips unsupported entries across integrations, tools, skills, and tasks in one pass', () => {
		const config = {
			...baseConfig,
			integrations: [
				{ type: 'schedule', cronExpression: '0 9 * * *' },
				{ type: 'linear', credentialId: 'cred-linear' },
			],
			tools: [
				{ type: 'skill', id: 'wrong_collection' },
				{ type: 'workflow', workflow: 'wf-1' },
			],
			skills: [
				{ type: 'custom', id: 'wrong_collection' },
				{ type: 'skill', id: 'summarize' },
			],
			tasks: [
				{ type: 'schedule', id: 'legacy_task', enabled: true },
				{ type: 'task', id: 'weekly_review', enabled: true },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			integrations: [{ type: 'linear', credentialId: 'cred-linear' }],
			tools: [{ type: 'workflow', workflow: 'wf-1' }],
			skills: [{ type: 'skill', id: 'summarize' }],
			tasks: [{ type: 'task', id: 'weekly_review', enabled: true }],
		});
	});

	it('leaves malformed typed-array entries in place for schema validation to reject', () => {
		const config = {
			...baseConfig,
			integrations: [null, { credentialId: 'cred-slack' }, { type: 123 }],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
		expect(AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(config)).success).toBe(false);
	});

	it('does not mutate the input object', () => {
		const config = {
			...baseConfig,
			integrations: [{ type: 'schedule', cronExpression: '0 9 * * *' }],
		};
		const originalIntegrations = config.integrations;

		sanitizeAgentJsonConfig(config);

		expect(config.integrations).toBe(originalIntegrations);
		expect(config.integrations).toHaveLength(1);
	});

	it('preserves empty typed arrays', () => {
		const config = {
			...baseConfig,
			integrations: [],
			tools: [],
			skills: [],
			tasks: [],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
	});
});
