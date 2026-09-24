import { AgentIntegrationConfigSchema, AgentIntegrationSchema } from '../agent-integration.schema';
import { AgentJsonConfigSchema } from '../agent-json-config.schema';

describe('AgentIntegrationSchema', () => {
	it('accepts n8n Chat without a credential in agent configuration', () => {
		expect(AgentIntegrationConfigSchema.parse({ type: 'n8n_chat' })).toEqual({
			type: 'n8n_chat',
			credentialId: '',
		});
		expect(AgentIntegrationSchema.safeParse({ type: 'n8n_chat' }).success).toBe(false);
	});

	it('rejects duplicate n8n Chat channel entries', () => {
		expect(
			AgentJsonConfigSchema.safeParse({
				name: 'Agent',
				model: 'openai/gpt-4o-mini',
				instructions: 'Help',
				integrations: [{ type: 'n8n_chat' }, { type: 'n8n_chat' }],
			}).success,
		).toBe(false);
	});
	it('accepts a telegram integration with credential id', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'telegram',
			credentialId: 'cred-123',
			settings: { accessMode: 'private', allowedUsers: ['123'] },
		});
		expect(result.success).toBe(true);
	});

	it('accepts an existing Slack integration without messaging settings', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'slack',
			credentialId: 'cred-123',
		});
		expect(result.success).toBe(true);
	});

	it('accepts a Slack integration that uses the Agent messaging experience', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'slack',
			credentialId: 'cred-123',
			settings: { messagingExperience: 'agent' },
		});
		expect(result.success).toBe(true);
	});

	it('rejects an unknown Slack messaging experience', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'slack',
			credentialId: 'cred-123',
			settings: { messagingExperience: 'unknown' },
		});
		expect(result.success).toBe(false);
	});

	it('rejects Telegram private settings without allowed users', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'telegram',
			credentialId: 'cred-telegram',
			settings: { accessMode: 'private', allowedUsers: [] },
		});
		expect(result.success).toBe(false);
	});

	it('accepts a Discord integration with a session idle timeout', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'discord',
			credentialId: 'cred-123',
			settings: { sessionIdleTimeoutMinutes: 60 },
		});
		expect(result.success).toBe(true);
	});

	it('accepts a Linear integration without settings', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'linear',
			credentialId: 'cred-123',
		});
		expect(result.success).toBe(true);
	});

	it('rejects a non-positive session idle timeout', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'telegram',
			credentialId: 'cred-123',
			settings: { accessMode: 'public', allowedUsers: [], sessionIdleTimeoutMinutes: 0 },
		});
		expect(result.success).toBe(false);
	});

	it('rejects the removed schedule integration type', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			active: true,
			cronExpression: '0 9 * * *',
		});
		expect(result.success).toBe(false);
	});

	describe('action approval', () => {
		it.each(['slack', 'telegram', 'discord', 'linear'])(
			'accepts selected actions on a %s integration',
			(type) => {
				const result = AgentIntegrationSchema.safeParse({
					type,
					credentialId: 'cred-123',
					approval: { mode: 'selected', tools: ['send_channel_message'] },
				});
				expect(result.success).toBe(true);
			},
		);

		it('leaves approval undefined when it is absent', () => {
			const result = AgentIntegrationSchema.safeParse({
				type: 'slack',
				credentialId: 'cred-123',
			});
			expect(result.success && result.data.approval).toBeUndefined();
		});

		it('accepts the global mode without a list', () => {
			const result = AgentIntegrationSchema.safeParse({
				type: 'slack',
				credentialId: 'cred-123',
				approval: { mode: 'global' },
			});
			expect(result.success).toBe(true);
		});

		it('rejects selected approval with nothing selected', () => {
			const result = AgentIntegrationSchema.safeParse({
				type: 'slack',
				credentialId: 'cred-123',
				approval: { mode: 'selected', tools: [] },
			});
			expect(result.success).toBe(false);
		});

		it('rejects an unknown approval mode', () => {
			const result = AgentIntegrationSchema.safeParse({
				type: 'slack',
				credentialId: 'cred-123',
				approval: { mode: 'always' },
			});
			expect(result.success).toBe(false);
		});
	});
});
