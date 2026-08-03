import { AgentIntegrationSchema } from '../agent-integration.schema';

describe('AgentIntegrationSchema', () => {
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

	it('rejects Telegram private settings without allowed users', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'telegram',
			credentialId: 'cred-telegram',
			settings: { accessMode: 'private', allowedUsers: [] },
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
});
