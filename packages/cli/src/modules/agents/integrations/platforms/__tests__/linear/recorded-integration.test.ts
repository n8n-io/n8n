import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

import {
	createLinearReplayContext,
	type LinearAgentSessionEventFixture,
	type LinearReplayFixtures,
} from '../../../__tests__/helpers/linear/replay-test-context';
import type { ChannelIntegrationRecord } from '../../../recording/channel-integration-recorder';

const recordedSession = jsonParse<ChannelIntegrationRecord[]>(
	readFileSync(join(__dirname, '../../../__tests__/fixtures/linear/recorded-session.json'), 'utf8'),
);

function getRecordedWebhook() {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'webhook' }> =>
			entry.type === 'webhook' && entry.platform === 'linear',
	);
	if (!record) throw new Error('Expected Linear webhook record');
	return record;
}

function getRecordedAgentActivityCreate() {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'fetch' }> => {
			if (entry.type !== 'fetch' || !entry.requestBody) return false;
			const request = jsonParse<{ variables?: { input?: { agentSessionId?: string } } }>(
				entry.requestBody,
			);
			return request.variables?.input?.agentSessionId === 'AGENT_SESSION_1';
		},
	);
	if (!record?.requestBody) throw new Error('Expected Linear agentActivityCreate fetch record');
	return record;
}

function recordedLinearFixtures(): LinearReplayFixtures {
	const mention = jsonParse<LinearAgentSessionEventFixture>(getRecordedWebhook().body);

	return {
		botUser: {
			id: mention.appUserId,
			name: 'testapp',
			displayName: 'testapp',
			app: true,
		},
		mention,
	};
}

function recordedAgentActivityInput() {
	return jsonParse<{
		variables: {
			input: {
				agentSessionId: string;
				content: { type: string; body: string };
			};
		};
	}>(getRecordedAgentActivityCreate().requestBody ?? '{}').variables.input;
}

describe('Linear recorded integration replay', () => {
	it('replays the captured Linear agent session webhook and outbound activity', async () => {
		const fixtures = recordedLinearFixtures();
		const recordedActivityInput = recordedAgentActivityInput();
		const ctx = await createLinearReplayContext(fixtures, {
			stream: [
				{
					type: 'text-delta',
					id: 'recorded-linear-response',
					delta: recordedActivityInput.content.body,
				},
				{ type: 'finish', finishReason: 'stop' },
			],
		});

		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '@testapp hey',
					integrationType: 'linear',
				}),
			);
			expect(ctx.latestContext()).toMatchObject({
				platform: 'linear',
				messageId: 'COMMENT_SOURCE',
				interactingUserId: 'USER_ALICE',
				target: {
					threadId: 'linear:AGENT_SESSION_1',
					channelId: 'ISSUE_1',
				},
				subject: {
					type: 'issue',
					id: 'YEH-1',
					title: 'Get familiar with Linear',
					description: 'Welcome to Linear!',
					url: 'https://linear.app/workspace/issue/YEH-1/get-familiar-with-linear',
					author: {
						id: 'USER_ALICE',
						name: 'Alice Developer',
					},
				},
			});
			expect(ctx.lastPost()?.body).toEqual(recordedActivityInput);
		} finally {
			await ctx.shutdown();
		}
	});

	it('responds to the current Linear agent session through the action executor', async () => {
		const fixtures = recordedLinearFixtures();
		const ctx = await createLinearReplayContext(fixtures);

		try {
			await ctx.sendWebhook(fixtures.mention);
			const context = ctx.latestContext();
			expect(context).toMatchObject({
				platform: 'linear',
				target: { threadId: 'linear:AGENT_SESSION_1' },
			});

			const result = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'respond',
				input: { message: { text: 'Action response' } },
				awaitResponse: false,
				currentMessageContext: context,
			});

			expect(result).toMatchObject({
				ok: true,
				messageContext: {
					platform: 'linear',
					target: { type: 'thread', threadId: 'linear:AGENT_SESSION_1' },
				},
			});
			expect(ctx.lastPost()?.body).toMatchObject({
				agentSessionId: 'AGENT_SESSION_1',
				content: { type: 'response', body: 'Action response' },
			});
		} finally {
			await ctx.shutdown();
		}
	});
});
