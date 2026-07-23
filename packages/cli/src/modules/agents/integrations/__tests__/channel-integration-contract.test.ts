import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import { runSharedChannelIntegrationContract } from './helpers/channel-integration-contract';
import {
	createSlackReplayContext,
	type SlackReplayFixtures,
} from './helpers/slack/replay-test-context';
import {
	createTelegramReplayContext,
	type TelegramReplayFixtures,
} from './helpers/telegram/replay-test-context';

const slackFixtures = jsonParse<SlackReplayFixtures>(
	readFileSync(join(__dirname, 'fixtures/slack/basic.json'), 'utf8'),
);
const telegramFixtures = jsonParse<TelegramReplayFixtures>(
	readFileSync(join(__dirname, 'fixtures/telegram/basic.json'), 'utf8'),
);

runSharedChannelIntegrationContract({
	name: 'Slack',
	fixtures: slackFixtures,
	expected: {
		message: 'hello agent',
		followUpMessage: 'follow up',
		integrationType: 'slack',
		context: {
			integrationConnectionId: 'slack:cred-slack',
			platform: 'slack',
			messageId: '1719000000.000100',
			interactingUserId: 'U_ALICE',
			agentUserId: 'U_BOT',
			target: {
				type: 'thread',
				threadId: 'slack:C_SUPPORT:1719000000.000100',
				channelId: 'slack:C_SUPPORT',
			},
		},
		resourceId: 'U_ALICE',
		firstPost: {
			channel: 'C_SUPPORT',
			thread_ts: '1719000000.000100',
			markdown_text: 'Got it',
		},
		respondPost: {
			channel: 'C_SUPPORT',
			thread_ts: '1719000000.000100',
			text: 'Action response',
		},
		respondTarget: { threadId: 'slack:C_SUPPORT:1719000000.000100' },
	},
	createContext: async () => await createSlackReplayContext(slackFixtures),
});

// NOTE: Linear is intentionally not in the shared contract. The real
// @chat-adapter/linear only treats agent-session events as mentions (a bare
// Comment has isMention=false), and agent-session vs comment threads don't share
// an id — so the comment-as-mention + subscribe/follow-up contract doesn't model
// real Linear behavior. Linear's real flow is covered by its recorded
// agent-session test (platforms/__tests__/linear/recorded-integration.test.ts).

runSharedChannelIntegrationContract({
	name: 'Telegram',
	fixtures: telegramFixtures,
	expected: {
		message: 'hello agent',
		followUpMessage: 'follow up',
		integrationType: 'telegram',
		context: {
			integrationConnectionId: 'telegram:cred-telegram',
			platform: 'telegram',
			messageId: '123456:11',
			interactingUserId: '123456',
			target: {
				type: 'thread',
				threadId: 'telegram:123456',
				channelId: 'telegram:123456',
			},
		},
		resourceId: '123456',
		firstPost: {
			chat_id: '123456',
			text: 'Got it',
		},
		respondPost: {
			chat_id: '123456',
			text: 'Action response',
		},
		respondTarget: { threadId: 'telegram:123456' },
	},
	createContext: async () => await createTelegramReplayContext(telegramFixtures),
});
