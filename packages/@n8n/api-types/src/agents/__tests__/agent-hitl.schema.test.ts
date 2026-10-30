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

it.each([true, false])('discards the retired requester policy %s from both methods', (policy) => {
	for (const configuration of [
		{ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' },
		{ ...base, channel: 'telegram' },
	]) {
		expect(
			AgentHitlConfigurationSchema.parse({ ...configuration, disallowRequesterApproval: policy }),
		).toEqual(configuration);
	}
});

it.each([true, false])('keeps the name override state %s in both methods', (nameOverridden) => {
	for (const configuration of [
		{ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' },
		{ ...base, channel: 'telegram' },
	]) {
		expect(AgentHitlConfigurationSchema.parse({ ...configuration, nameOverridden })).toEqual({
			...configuration,
			nameOverridden,
		});
	}
});

it.each([undefined, 3600, 86400, 604800])(
	'accepts request expiry %s for both methods',
	(expirySeconds) => {
		for (const configuration of [
			{ id: 'review', name: 'Review', method: 'workflow', workflowId: 'wf' },
			{ ...base, channel: 'telegram' },
		]) {
			expect(
				AgentHitlConfigurationSchema.parse({ ...configuration, expirySeconds }).expirySeconds,
			).toBe(expirySeconds);
		}
	},
);

it.each([0, -1, 60, '3600', null])('rejects unsupported expiry %s', (expirySeconds) => {
	expect(
		AgentHitlConfigurationSchema.safeParse({ ...base, channel: 'telegram', expirySeconds }).success,
	).toBe(false);
});
