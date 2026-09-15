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

	it.each(['discord', 'linear', 'teams'])(
		'accepts a %s integration with or without a session idle timeout',
		(type) => {
			expect(AgentIntegrationSchema.safeParse({ type, credentialId: 'cred-123' }).success).toBe(
				true,
			);
			expect(
				AgentIntegrationSchema.safeParse({
					type,
					credentialId: 'cred-123',
					settings: { sessionIdleTimeoutMinutes: 30 },
				}).success,
			).toBe(true);
		},
	);

	it('rejects Teams settings it does not define', () => {
		const result = AgentIntegrationSchema.safeParse({
			type: 'teams',
			credentialId: 'cred-123',
			settings: { accessMode: 'public' },
		});
		expect(result.success).toBe(false);
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

	describe('Teams availability settings', () => {
		const parse = (settings: Record<string, unknown>) =>
			AgentIntegrationSchema.safeParse({ type: 'teams', credentialId: 'cred-123', settings });

		it.each([
			['nothing beyond the shared shape', {}],
			['team channels', { teamChannels: true }],
			['group chats', { groupChats: true }],
			['a read permission with its scope', { teamChannels: true, readAllChannelMessages: true }],
			[
				'both reads with both scopes',
				{
					teamChannels: true,
					groupChats: true,
					readAllChannelMessages: true,
					readAllGroupMessages: true,
				},
			],
		])('accepts %s', (_label, settings) => {
			expect(parse(settings).success).toBe(true);
		});

		it.each([
			['reading channels without team channels', { readAllChannelMessages: true }],
			['reading group chats without group chats', { readAllGroupMessages: true }],
			[
				'reading channels while team channels are off',
				{ teamChannels: false, readAllChannelMessages: true },
			],
		])('rejects %s', (_label, settings) => {
			expect(parse(settings).success).toBe(false);
		});

		it('still rejects an unknown setting', () => {
			expect(parse({ somethingElse: true }).success).toBe(false);
		});
	});
});
