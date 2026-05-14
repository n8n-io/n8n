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

	it('accepts a chat integration with credential name', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'slack',
			credentialId: 'cred-123',
			credentialName: 'Acme Slack',
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
			credentialName: 'Acme',
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

	it('accepts any non-empty cronExpression string (cron syntax validation is backend-only)', () => {
		for (const cron of ['not-a-cron', '* * *', '99 99 * * *']) {
			const result = AgentIntegrationSchema.safeParse({
				type: 'schedule',
				active: false,
				cronExpression: cron,
				wakeUpPrompt: 'go',
			});
			expect(result.success).toBe(true);
		}
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
