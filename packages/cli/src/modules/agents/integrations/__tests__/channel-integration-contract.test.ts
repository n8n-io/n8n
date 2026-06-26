import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import { runSharedChannelIntegrationContract } from './helpers/channel-integration-contract';
import {
	createLinearReplayContext,
	type LinearCommentEventFixture,
	type LinearReplayFixtures,
} from './helpers/linear/replay-test-context';
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
const linearFixtures = jsonParse<
	LinearReplayFixtures & {
		followUp: LinearCommentEventFixture;
		selfMessage: LinearCommentEventFixture;
	}
>(readFileSync(join(__dirname, 'fixtures/linear/basic.json'), 'utf8'));
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
				channelId: 'C_SUPPORT',
			},
		},
		resourceId: 'U_ALICE',
		firstPost: {
			channel: 'C_SUPPORT',
			thread_ts: '1719000000.000100',
			text: 'Got it',
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

runSharedChannelIntegrationContract({
	name: 'Linear',
	fixtures: linearFixtures,
	expected: {
		message: '@AgentName hello agent',
		followUpMessage: 'follow up',
		integrationType: 'linear',
		context: {
			integrationConnectionId: 'linear:cred-linear',
			platform: 'linear',
			messageId: 'COMMENT_1',
			interactingUserId: 'USER_ALICE',
			target: {
				type: 'thread',
				threadId: 'linear:ISSUE_123',
				channelId: 'ISSUE_123',
			},
			subject: {
				type: 'issue',
				id: 'ENG-123',
				title: 'Investigate customer workflow',
				description: 'Customer reported unexpected workflow behavior.',
				url: 'https://linear.app/n8n/issue/ENG-123/investigate-customer-workflow',
				author: {
					id: 'USER_ALICE',
					name: 'Alice Developer',
				},
			},
		},
		resourceId: 'USER_ALICE',
		firstPost: {
			issueId: 'ISSUE_123',
			body: 'Got it',
		},
		respondPost: {
			issueId: 'ISSUE_123',
			body: 'Action response',
		},
		respondTarget: { threadId: 'linear:ISSUE_123' },
	},
	createContext: async () => await createLinearReplayContext(linearFixtures),
});

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
