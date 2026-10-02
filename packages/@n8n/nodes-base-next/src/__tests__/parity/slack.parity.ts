import { SlackApi } from 'n8n-nodes-base/dist/credentials/SlackApi.credentials';
import { Slack } from 'n8n-nodes-base/dist/nodes/Slack/Slack.node';

import { createSlackChannel } from '../../nodes/slack/actions/channel.create';
import { getSlackChannel } from '../../nodes/slack/actions/channel.get';
import { getManySlackChannels } from '../../nodes/slack/actions/channel.get-all';
import { getSlackChannelHistory } from '../../nodes/slack/actions/channel.history';
import { uploadSlackFile } from '../../nodes/slack/actions/file.upload';
import { deleteSlackMessage } from '../../nodes/slack/actions/message.delete';
import { getSlackPermalink } from '../../nodes/slack/actions/message.get-permalink';
import { sendSlackMessage } from '../../nodes/slack/actions/message.send';
import { updateSlackMessage } from '../../nodes/slack/actions/message.update';
import { addSlackReaction } from '../../nodes/slack/actions/reaction.add';
import { getSlackUser } from '../../nodes/slack/actions/user.get';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type Route,
} from './harness';

const API = 'https://slack.com/api';
const POST = `POST ${API}/chat.postMessage`;

const credential: ParityCase['credential'] = {
	data: { accessToken: 'xoxb-parity' },
	types: [new SlackApi()],
};

const legacyNode = (parameters: Record<string, unknown>) => ({
	nodeType: new Slack(),
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.7,
	credential: 'slackApi',
	parameters: { authentication: 'accessToken', ...parameters },
});

const posted = (text: string, extra: Record<string, unknown> = {}): Route => ({
	method: 'POST',
	url: `${API}/chat.postMessage`,
	json: {
		ok: true,
		channel: 'C0OPS',
		ts: '1700000000.000100',
		message: { type: 'message', user: 'U0BOT', text, ts: '1700000000.000100', ...extra },
	},
});

const legacyPost = (text: string, otherOptions: Record<string, unknown> = {}) =>
	legacyNode({
		resource: 'message',
		operation: 'post',
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: '#ops' },
		messageType: 'text',
		text,
		otherOptions,
	});

/** The legacy node renames `ts` to `message_timestamp` in its output; the action keeps `ts`. */
const renamedTs = (count: number): AllowedDifference[] =>
	Array.from({ length: count }, (_, index) =>
		['ts', 'message_timestamp'].map(
			(field): AllowedDifference => ({
				path: `items[${index}].json.${field}`,
				kind: 'intended',
				reason:
					'The action emits the Slack field ts, as Slack documents it and as history items have it.',
			}),
		),
	).flat();

/** Legacy merges its options into the body, so Slack gets the n8n option too. */
const leakedOption = (count: number): AllowedDifference[] =>
	Array.from({ length: count }, (_, index) => ({
		path: `requests.${POST} #${index}.body.includeLinkToWorkflow`,
		kind: 'intended',
		reason: 'The legacy node sends its includeLinkToWorkflow option to Slack; Slack ignores it.',
	}));

describe('slack.message.send parity with Slack v2.7 message post', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{ count: 3 }, { count: 4 }],
		routes: [posted('Open tickets')],
	};

	it('sends the same request without the attribution line', async () => {
		const legacy = await runNode(
			legacyPost('=Open tickets: {{ $json.count }}', { includeLinkToWorkflow: false }),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendSlackMessage,
				{ channel: '#ops', text: '=Open tickets: {{ $json.count }}', appendAttribution: false },
				'slackApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, [...leakedOption(2), ...renamedTs(2)])).toEqual({
			unexplained: [],
			stale: [],
		});
	});

	it('appends an attribution line by default', async () => {
		const legacy = await runNode(legacyPost('Deploy done'), parityCase);
		const next = await runNode(
			actionNode(sendSlackMessage, { channel: '#ops', text: 'Deploy done' }, 'slackApi'),
			parityCase,
		);
		const attribution = [0, 1].map(
			(index): AllowedDifference => ({
				path: `requests.${POST} #${index}.body.text`,
				kind: 'intended',
				reason:
					'The action links n8n.io: the run context has no instance URL, workflow ID or instance ID.',
			}),
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.requests[`${POST} #0`]?.body).toMatchObject({
			text: expect.stringMatching(/^Deploy done\n_Automated with this <http:\/\/localhost/),
		});
		expect(next.requests[`${POST} #0`]?.body).toMatchObject({
			text: expect.stringMatching(/^Deploy done\n_Automated with <https:\/\/n8n\.io\//),
		});
		expect(compareRuns(legacy, next, [...attribution, ...renamedTs(2)])).toEqual({
			unexplained: [],
			stale: [],
		});
	});

	it('sends the same thread reply and blocks', async () => {
		const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: '*Fixed*' } }];
		const threadCase: ParityCase = { credential, input: [{}], routes: [posted('Fixed')] };
		const legacy = await runNode(
			legacyNode({
				resource: 'message',
				operation: 'post',
				select: 'channel',
				channelId: { __rl: true, mode: 'id', value: 'C0OPS' },
				messageType: 'block',
				blocksUi: JSON.stringify({ blocks }),
				text: 'Fixed',
				otherOptions: {
					includeLinkToWorkflow: false,
					thread_ts: { replyValues: { thread_ts: 1700000000.0001, reply_broadcast: true } },
				},
			}),
			threadCase,
		);
		const next = await runNode(
			actionNode(
				sendSlackMessage,
				{
					channel: 'C0OPS',
					text: 'Fixed',
					blocks,
					threadTs: '1700000000.0001',
					replyBroadcast: true,
					appendAttribution: false,
				},
				'slackApi',
			),
			threadCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [...leakedOption(1), ...renamedTs(1)])).toEqual({
			unexplained: [],
			stale: [],
		});
	});

	it('fails the same way on a Slack error', async () => {
		const errorCase: ParityCase = {
			credential,
			input: [{}],
			routes: [
				{
					method: 'POST',
					url: `${API}/chat.postMessage`,
					json: { ok: false, error: 'channel_not_found' },
				},
			],
		};
		const legacy = await runNode(legacyPost('x', { includeLinkToWorkflow: false }), errorCase);
		const next = await runNode(
			actionNode(
				sendSlackMessage,
				{ channel: '#ops', text: 'x', appendAttribution: false },
				'slackApi',
			),
			errorCase,
		);
		expect(legacy.error).toBe('Slack error response: "channel_not_found"');
		expect(compareRuns(legacy, next, leakedOption(1))).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.channel.history parity with Slack v2.7 channel history', () => {
	const message = (ts: string, text: string) => ({ type: 'message', user: 'U01', text, ts });
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: `${API}/conversations.history`,
				json: {
					ok: true,
					messages: [message('1700000100.000100', 'older'), message('1700000200.000100', 'newer')],
					has_more: false,
					response_metadata: { next_cursor: '' },
				},
			},
		],
	};

	it('sends the same request and emits the same items, newest first', async () => {
		const legacy = await runNode(
			legacyNode({
				resource: 'channel',
				operation: 'history',
				channelId: { __rl: true, mode: 'id', value: 'C0GENERAL1' },
				returnAll: false,
				limit: 10,
				filters: { oldest: '2023-11-14T00:00:00.000Z', inclusive: true },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getSlackChannelHistory,
				{
					channel: 'C0GENERAL1',
					paging: { mode: 'limit', max: 10 },
					filters: { oldest: '2023-11-14T00:00:00.000Z', inclusive: true },
				},
				'slackApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items.map(({ json }) => (json as { text: string }).text)).toEqual([
			'newer',
			'older',
		]);
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

const TS = '1700000000.000100';
const one: Pick<ParityCase, 'credential' | 'input'> = { credential, input: [{}] };
const reply = (method: Route['method'], path: string, json: unknown): Route => ({
	method,
	url: `${API}${path}`,
	json,
});
const channelId = (value: string) => ({ __rl: true, mode: 'id', value });

describe('slack.message.update parity with Slack v2.7 message update', () => {
	it('sends the same request and emits the same item', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [
				reply('POST', '/chat.update', {
					ok: true,
					channel: 'C0OPS',
					ts: TS,
					text: 'Fixed',
					message: { type: 'message', text: 'Fixed', ts: TS },
				}),
			],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'message',
				operation: 'update',
				channelId: channelId('C0OPS'),
				ts: TS,
				messageType: 'text',
				text: 'Fixed',
				updateFields: {},
				otherOptions: { includeLinkToWorkflow: false },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				updateSlackMessage,
				{ channel: 'C0OPS', ts: TS, text: 'Fixed', appendAttribution: false },
				'slackApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, renamedTs(1))).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.message.delete parity with Slack v2.7 message delete', () => {
	it('sends the same request and emits the same item', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [reply('POST', '/chat.delete', { ok: true, channel: 'C0OPS', ts: TS })],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'message',
				operation: 'delete',
				select: 'channel',
				channelId: channelId('C0OPS'),
				timestamp: TS,
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(deleteSlackMessage, { channel: 'C0OPS', ts: TS }, 'slackApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, renamedTs(1))).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.message.getPermalink parity with Slack v2.7 message getPermalink', () => {
	it('sends the same request and emits the same item', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [
				reply('GET', '/chat.getPermalink', {
					ok: true,
					channel: 'C0OPS',
					permalink: 'https://acme.slack.com/archives/C0OPS/p1700000000000100',
				}),
			],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'message',
				operation: 'getPermalink',
				channelId: channelId('C0OPS'),
				timestamp: TS,
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(getSlackPermalink, { channel: 'C0OPS', ts: TS }, 'slackApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.reaction.add parity with Slack v2.7 reaction add', () => {
	it('sends the same request and emits the same item', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [reply('POST', '/reactions.add', { ok: true })],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'reaction',
				operation: 'add',
				channelId: channelId('C0OPS'),
				timestamp: TS,
				name: 'white_check_mark',
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				addSlackReaction,
				{ channel: 'C0OPS', ts: TS, name: 'white_check_mark' },
				'slackApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

const general = {
	id: 'C0GENERAL1',
	name: 'general',
	is_channel: true,
	is_private: false,
	is_member: true,
	topic: { value: 'News' },
};

describe('slack.channel.get parity with Slack v2.7 channel get', () => {
	it('reads the same channel with GET instead of POST', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [
				reply('POST', '/conversations.info', { ok: true, channel: general }),
				reply('GET', '/conversations.info', { ok: true, channel: general }),
			],
		};
		const legacy = await runNode(
			legacyNode({ resource: 'channel', operation: 'get', channelId: channelId('C0GENERAL1') }),
			parityCase,
		);
		const next = await runNode(
			actionNode(getSlackChannel, { channel: 'C0GENERAL1' }, 'slackApi'),
			parityCase,
		);
		const allowed: AllowedDifference[] = ['POST', 'GET'].map((method) => ({
			path: `requests.${method} ${API}/conversations.info #0`,
			kind: 'intended',
			reason: 'conversations.info reads, so the action sends GET, which the host may retry.',
		}));
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(next.requests[`GET ${API}/conversations.info #0`]?.query).toEqual({
			channel: 'C0GENERAL1',
		});
		expect(compareRuns(legacy, next, allowed)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.channel.getAll parity with Slack v2.7 channel getAll', () => {
	it('sends the same request and emits the same items', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [
				reply('GET', '/conversations.list', {
					ok: true,
					channels: [general, { id: 'C0RANDOM01', name: 'random' }],
					response_metadata: { next_cursor: 'c2' },
				}),
			],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'channel',
				operation: 'getAll',
				returnAll: false,
				limit: 2,
				filters: { types: ['public_channel', 'private_channel'], excludeArchived: true },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getManySlackChannels,
				{
					types: ['public_channel', 'private_channel'],
					excludeArchived: true,
					paging: { mode: 'limit', max: 2 },
				},
				'slackApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.channel.create parity with Slack v2.7 channel create', () => {
	it('sends the same request and emits the same item', async () => {
		const parityCase: ParityCase = {
			...one,
			routes: [
				reply('POST', '/conversations.create', {
					ok: true,
					channel: { id: 'C0LAUNCH01', name: 'launch', is_private: true },
				}),
			],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'channel',
				operation: 'create',
				channelId: '#launch',
				channelVisibility: 'private',
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(createSlackChannel, { name: '#launch', isPrivate: true }, 'slackApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.user.get parity with Slack v2.7 user info and lookupByEmail', () => {
	const ada = { id: 'U0ADA', name: 'ada', real_name: 'Ada', profile: { email: 'ada@example.com' } };
	const parityCase: ParityCase = {
		...one,
		routes: [
			reply('GET', '/users.info', { ok: true, user: ada }),
			reply('GET', '/users.lookupByEmail', { ok: true, user: ada }),
		],
	};

	it('sends the same request for a user ID', async () => {
		const legacy = await runNode(
			legacyNode({
				resource: 'user',
				operation: 'info',
				user: { __rl: true, mode: 'id', value: 'U0ADA' },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(getSlackUser, { user: { by: 'id', id: 'U0ADA' } }, 'slackApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});

	it('sends the same request for an email address', async () => {
		const legacy = await runNode(
			legacyNode({ resource: 'user', operation: 'lookupByEmail', email: 'ada@example.com' }),
			parityCase,
		);
		const next = await runNode(
			actionNode(getSlackUser, { user: { by: 'email', email: 'ada@example.com' } }, 'slackApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

describe('slack.file.upload parity with Slack v2.7 file upload', () => {
	const UPLOAD = 'https://files.slack.com/upload/v1/ABC';
	const bytes = Buffer.from('id,total\n1,42\n');
	const parityCase: ParityCase = {
		...one,
		binary: { data: { data: bytes.toString('base64'), mimeType: 'text/csv', fileName: 'q3.csv' } },
		headers: ['authorization', 'content-type'],
		routes: [
			reply('GET', '/files.getUploadURLExternal', {
				ok: true,
				upload_url: UPLOAD,
				file_id: 'F0REPORT',
			}),
			{
				method: 'POST',
				url: UPLOAD,
				raw: { body: Buffer.from('OK - 15'), headers: { 'content-type': 'text/plain' } },
			},
			reply('POST', '/files.completeUploadExternal', {
				ok: true,
				files: [{ id: 'F0REPORT', title: 'q3.csv' }],
			}),
		],
	};

	it('sends the same requests, with the bytes as the body instead of a form', async () => {
		const legacy = await runNode(
			legacyNode({
				resource: 'file',
				operation: 'upload',
				binaryPropertyName: 'data',
				options: { channelId: 'C0OPS', initialComment: 'Q3 numbers' },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				uploadSlackFile,
				{ file: 'data', channel: 'C0OPS', initialComment: 'Q3 numbers' },
				'slackApi',
			),
			parityCase,
		);
		const upload = `POST ${UPLOAD} #0`;
		const allowed: AllowedDifference[] = [
			{
				path: `requests.${upload}.body`,
				kind: 'intended',
				reason: 'Slack takes the raw bytes; the action streams them instead of a multipart form.',
			},
			{
				path: `requests.${upload}.headers.content-type`,
				kind: 'intended',
				reason: 'The raw body has the file MIME type, not multipart/form-data.',
			},
		];
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(next.requests[upload]?.body).toBe(bytes.toString());
		expect(next.requests[upload]?.headers['content-type']).toBe('text/csv');
		expect(compareRuns(legacy, next, allowed)).toEqual({ unexplained: [], stale: [] });
	});
});
