import { AgentHitlConfigurationSchema } from '../agent-hitl.schema';
const base = {
	id: 'review',
	name: 'Review',
	method: 'channel',
	credentialId: 'credential',
	recipient: { kind: 'user', id: '1234' },
};
it('requires a numeric Telegram user ID', () => {
	expect(AgentHitlConfigurationSchema.safeParse({ ...base, channel: 'telegram' }).success).toBe(
		true,
	);
	expect(
		AgentHitlConfigurationSchema.safeParse({
			...base,
			channel: 'telegram',
			recipient: { kind: 'user', id: '@reviewer' },
		}).success,
	).toBe(false);
});
it('requires a Discord server and excludes Linear', () => {
	expect(AgentHitlConfigurationSchema.safeParse({ ...base, channel: 'discord' }).success).toBe(
		false,
	);
	expect(
		AgentHitlConfigurationSchema.safeParse({ ...base, channel: 'discord', guildId: '42' }).success,
	).toBe(true);
	expect(AgentHitlConfigurationSchema.safeParse({ ...base, channel: 'linear' }).success).toBe(
		false,
	);
});
