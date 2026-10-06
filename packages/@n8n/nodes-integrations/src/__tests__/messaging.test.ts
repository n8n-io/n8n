import { hostRuntime, lookupActionOf, lookupsOf, toVersionedNodeType } from '@n8n/node-sdk/host';
import { toContract } from '@n8n/node-sdk/registry';
import { mockHttp, runAction } from '@n8n/node-sdk/testing';
import { SlackApi } from 'n8n-nodes-base/dist/credentials/SlackApi.credentials';
import { WhatsAppApi } from 'n8n-nodes-base/dist/credentials/WhatsAppApi.credentials';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { versionsOf } from './first-party';

import { getSlackChannelHistory } from '../nodes/slack/actions/channel.history';
import { deleteSlackMessage } from '../nodes/slack/actions/message.delete';
import { sendSlackMessage } from '../nodes/slack/actions/message.send';
import { sendWhatsAppMessage } from '../nodes/whats-app/actions/message.send';

const slack = {
	credential: { type: 'slackApi', data: { accessToken: 'xoxb-test' } },
	credentials: [new SlackApi()],
};

const message = (ts: string) => ({ type: 'message', user: 'U01', text: ts, ts });

describe('slack.channel.history', () => {
	it('pages by cursor up to the limit and emits newest first', async () => {
		const fetch = mockHttp([
			{
				path: '/conversations.history',
				query: { cursor: 'c2' },
				reply: { json: { ok: true, messages: [message('1700000003.000000')] } },
			},
			{
				path: '/conversations.history',
				times: 1,
				reply: {
					json: {
						ok: true,
						messages: [message('1700000001.000000'), message('1700000002.000000')],
						response_metadata: { next_cursor: 'c2' },
					},
				},
			},
		]);
		const result = await runAction(getSlackChannelHistory, {
			...slack,
			input: { channel: 'C0GENERAL1', paging: { mode: 'limit', max: 3 } },
			fetch,
		});

		expect(fetch.calls.map((call) => call.query)).toEqual([
			{ channel: 'C0GENERAL1', limit: '3' },
			{ channel: 'C0GENERAL1', limit: '1', cursor: 'c2' },
		]);
		expect(fetch.calls[0]?.headers.authorization).toBe('Bearer xoxb-test');
		expect(result).toEqual({
			ok: true,
			items: ['1700000003.000000', '1700000002.000000', '1700000001.000000'].map(message),
		});
	});

	it('refuses a channel name before any request', async () => {
		const fetch = mockHttp([]);
		const result = await runAction(getSlackChannelHistory, {
			...slack,
			input: { channel: '#general' },
			fetch,
		});

		expect(result).toMatchObject({ ok: false, error: { path: 'input.channel' } });
		expect(fetch.calls).toEqual([]);
	});
});

describe('slack.message.send', () => {
	it('names the missing scopes of an ok: false answer', async () => {
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/chat.postMessage',
				reply: { json: { ok: false, error: 'missing_scope', needed: 'chat:write' } },
			},
		]);
		const result = await runAction(sendSlackMessage, {
			...slack,
			input: { channel: '#ops', text: 'x' },
			fetch,
		});

		expect(fetch.calls[0]?.headers['content-type']).toBe('application/json; charset=utf-8');
		expect(result).toMatchObject({
			ok: false,
			error: { message: 'Your Slack credential is missing required OAuth scopes: chat:write' },
		});
	});

	it('adds the attribution as a block when the message has blocks', async () => {
		const sent = { ok: true, channel: 'C0OPS', ts: '1.2', message: message('1.2') };
		const fetch = mockHttp([{ method: 'POST', path: '/chat.postMessage', reply: { json: sent } }]);
		const blocks = [{ type: 'divider' }];
		await runAction(sendSlackMessage, {
			...slack,
			input: { channel: 'C0OPS', text: 'Report', blocks },
			fetch,
		});

		expect(fetch.calls[0]?.body).toEqual({
			channel: 'C0OPS',
			text: 'Report',
			blocks: [
				{ type: 'divider' },
				{ type: 'section', text: { type: 'mrkdwn', text: expect.stringContaining('n8n') } },
			],
		});
	});
});

describe('whatsApp.message.send', () => {
	it('sends a document by media ID with its file name', async () => {
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/v13.0/106540352242922/messages',
				reply: {
					json: {
						messaging_product: 'whatsapp',
						contacts: [{ input: '4915112345678', wa_id: '4915112345678', user_id: 'US.1' }],
						messages: [{ id: 'wamid.DOC' }],
					},
				},
			},
		]);
		const result = await runAction(sendWhatsAppMessage, {
			credential: { type: 'whatsAppApi', data: { accessToken: 't', businessAccountId: 'b' } },
			credentials: [new WhatsAppApi()],
			input: {
				phoneNumberId: '106540352242922',
				to: '+49 (151) 1234-5678',
				message: {
					type: 'document',
					media: { source: 'id', id: '1013859600285441' },
					filename: 'invoice.pdf',
				},
			},
			fetch,
		});

		expect(fetch.calls[0]?.body).toEqual({
			messaging_product: 'whatsapp',
			to: '4915112345678',
			type: 'document',
			document: { id: '1013859600285441', filename: 'invoice.pdf' },
		});
		expect(result).toMatchObject({ ok: true, items: [{ messages: [{ id: 'wamid.DOC' }] }] });
	});

	it('keeps the HTTP status of a Graph API error', async () => {
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/v13.0/106540352242922/messages',
				reply: {
					status: 401,
					json: { error: { message: '(#190) Access token has expired', code: 190 } },
				},
			},
		]);
		const result = await runAction(sendWhatsAppMessage, {
			credential: { type: 'whatsAppApi', data: { accessToken: 't', businessAccountId: 'b' } },
			credentials: [new WhatsAppApi()],
			input: {
				phoneNumberId: '106540352242922',
				to: '+4915112345678',
				message: { type: 'text', body: 'Hi' },
			},
			fetch,
		});

		expect(result).toEqual({
			ok: false,
			error: { message: 'WhatsApp refused the message: Access token has expired', httpStatus: 401 },
		});
	});
});

describe('slack.channel lookup', () => {
	it('pages through conversations.list and keeps the channels whose name has the search text', async () => {
		const lookup = lookupsOf(toContract(deleteSlackMessage).input).get('slack.channel');
		if (!lookup) throw new Error('slack.channel has no lookup');
		const fetch = mockHttp([
			{
				path: '/conversations.list',
				query: { cursor: 'c2' },
				reply: { json: { ok: true, channels: [{ id: 'C02', name: 'eng-general' }] } },
			},
			{
				path: '/conversations.list',
				times: 1,
				reply: {
					json: {
						ok: true,
						channels: [
							{ id: 'C01', name: 'general' },
							{ id: 'C03', name: 'random' },
						],
						response_metadata: { next_cursor: 'c2' },
					},
				},
			},
		]);
		const result = await runAction(lookupActionOf(deleteSlackMessage, 'slack.channel', lookup), {
			...slack,
			input: { search: 'General', paging: { mode: 'limit', max: 500 } },
			fetch,
		});
		expect(result).toEqual({
			ok: true,
			items: [
				{ id: 'C01', label: '#general' },
				{ id: 'C02', label: '#eng-general' },
			],
		});
		expect(fetch.calls.map((call) => call.query)).toEqual([
			{ types: 'public_channel,private_channel', exclude_archived: 'true', limit: '200' },
			{
				types: 'public_channel,private_channel',
				exclude_archived: 'true',
				limit: '200',
				cursor: 'c2',
			},
		]);
	});

	it('fails with the Slack error code of an ok: false answer, from the manifest without the bundle', async () => {
		const nodeType = new (toVersionedNodeType(versionsOf('slack.message.delete'), hostRuntime()))();
		const listChannels = nodeType.getNodeType(1).methods?.listSearch?.['slack.channel'];
		const context = {
			getNode: () => ({ name: 'Slack', credentials: { slackApi: { id: '1', name: 'Slack' } } }),
			getCurrentNodeParameter: () => undefined,
			getCredentials: async () => ({ accessToken: 'xoxb-test' }),
			helpers: {
				httpRequestWithAuthentication: async () => ({ ok: false, error: 'missing_scope' }),
			},
			logger: { debug: () => undefined },
		};
		// The lookup reads only these members.
		await expect(listChannels?.call(context as unknown as ILoadOptionsFunctions)).rejects.toThrow(
			'The slack.channel lookup failed: missing_scope',
		);
	});
});
