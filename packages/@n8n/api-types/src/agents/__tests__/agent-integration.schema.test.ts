import { AgentIntegrationSchema } from '../agent-integration.schema';

describe('AgentIntegrationSchema', () => {
	it('accepts a schedule integration', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			active: true,
			cronExpression: '0 9 * * *',
			wakeUpPrompt: 'Daily standup ping',
		});
		expect(result.success).toBe(true);
	});

	it('accepts a telegram integration with credential id', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'telegram',
			credentialId: 'cred-123',
			settings: { accessMode: 'private', allowedUsers: ['123'] },
		});
		expect(result.success).toBe(true);
	});

	it('accepts a chat integration with credential id', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'slack',
			credentialId: 'cred-123',
		});
		expect(result.success).toBe(true);
	});

	it('rejects a schedule integration missing cronExpression', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			active: true,
			wakeUpPrompt: 'hello',
		});
		expect(result.success).toBe(false);
	});

	it('rejects a chat integration with the reserved type "schedule"', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			credentialId: 'cred-123',
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

	it('rejects a schedule integration with extra fields', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			active: true,
			cronExpression: '0 9 * * *',
			wakeUpPrompt: 'go',
			extra: 'nope',
		});
		expect(result.success).toBe(false);
	});

	it('rejects an empty cronExpression', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'schedule',
			active: false,
			cronExpression: '',
			wakeUpPrompt: 'go',
		});
		expect(result.success).toBe(false);
	});
});
