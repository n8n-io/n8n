import type {
	SlackChannelFixture,
	SlackEventFixture,
	SlackReplayFixtures,
	SlackUserFixture,
} from './replay-test-context';

export const slackUser = (overrides: Partial<SlackUserFixture> = {}): SlackUserFixture => ({
	id: 'U_ALICE',
	name: 'alice',
	real_name: 'Alice Developer',
	...overrides,
});

export const slackChannel = (
	overrides: Partial<SlackChannelFixture> = {},
): SlackChannelFixture => ({
	id: 'C_SUPPORT',
	name: 'support',
	...overrides,
});

export const slackEvent = (
	overrides: Partial<SlackEventFixture['event']> = {},
): SlackEventFixture['event'] => ({
	type: 'app_mention',
	user: 'U_ALICE',
	text: '<@U_BOT> hello agent',
	ts: '1719000000.000100',
	thread_ts: '1719000000.000100',
	channel: 'C_SUPPORT',
	channel_type: 'channel',
	team: 'T_TEAM',
	...overrides,
});

export const slackEventCallback = (
	overrides: Omit<Partial<SlackEventFixture>, 'event'> & {
		event?: Partial<SlackEventFixture['event']>;
	} = {},
): SlackEventFixture => ({
	token: 'SLACK_VERIFICATION_TOKEN',
	type: 'event_callback',
	team_id: 'T_TEAM',
	authorizations: [{ team_id: 'T_TEAM', user_id: 'U_BOT', is_bot: true }],
	event: slackEvent(overrides.event),
});

export const slackReplayFixtures = (
	overrides: Partial<SlackReplayFixtures> = {},
): SlackReplayFixtures => {
	const botUserId = overrides.botUserId ?? 'U_BOT';
	const user = overrides.user ?? slackUser();
	const channel = overrides.channel ?? slackChannel();
	const mention =
		overrides.mention ??
		slackEventCallback({
			event: {
				type: 'app_mention',
				user: user.id,
				text: `<@${botUserId}> hello agent`,
				channel: channel.id,
			},
		});

	return {
		botUserId,
		user,
		channel,
		mention,
		followUp:
			overrides.followUp ??
			slackEventCallback({
				event: {
					type: 'message',
					user: user.id,
					text: 'follow up',
					ts: '1719000001.000200',
					thread_ts: mention.event.thread_ts ?? mention.event.ts,
					channel: channel.id,
				},
			}),
		selfMessage:
			overrides.selfMessage ??
			slackEventCallback({
				event: {
					type: 'message',
					user: botUserId,
					bot_id: 'B_BOT',
					text: 'bot echo',
					ts: '1719000002.000300',
					thread_ts: mention.event.thread_ts ?? mention.event.ts,
					channel: channel.id,
				},
			}),
		...overrides,
	};
};
