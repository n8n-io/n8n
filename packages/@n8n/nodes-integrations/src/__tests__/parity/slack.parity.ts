import { SlackApi } from 'n8n-nodes-base/dist/credentials/SlackApi.credentials';
import { Slack } from 'n8n-nodes-base/dist/nodes/Slack/Slack.node';
import path from 'node:path';

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
	describeFixtureParity,
	type AllowedDifference,
	type FixtureParity,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const API = 'https://slack.com/api';
const POST = `POST ${API}/chat.postMessage`;

const slack: FixtureParity = {
	fixturesDir: path.resolve(__dirname, '../../../fixtures'),
	nodeType: new Slack(),
	credential: { data: { accessToken: 'xoxb-parity' }, types: [new SlackApi()] },
};

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

describeFixtureParity(sendSlackMessage, {
	...slack,
	cases: {
		'channel message with attribution': {
			allowed: [
				{
					path: `requests.${POST} #0.body.text`,
					kind: 'intended',
					reason:
						'The action links n8n.io: the run context has no instance URL, workflow ID or instance ID.',
				},
				...renamedTs(1),
			],
			check: (legacy, next) => {
				expect(legacy.requests[`${POST} #0`]?.body).toMatchObject({
					text: expect.stringMatching(/^3 open tickets\n_Automated with this <http:\/\/localhost/),
				});
				expect(next.requests[`${POST} #0`]?.body).toMatchObject({
					text: expect.stringMatching(/^3 open tickets\n_Automated with <https:\/\/n8n\.io\//),
				});
			},
		},
		'thread reply': { allowed: [...leakedOption(1), ...renamedTs(1)] },
		'one message per item, without attribution': {
			allowed: [...leakedOption(2), ...renamedTs(2)],
		},
		'Slack error': { allowed: leakedOption(1) },
	},
});

describeFixtureParity(getSlackChannelHistory, slack);

describeFixtureParity(updateSlackMessage, {
	...slack,
	cases: { 'replace text': { allowed: renamedTs(1) } },
});

describeFixtureParity(deleteSlackMessage, {
	...slack,
	cases: { delete: { allowed: renamedTs(1) } },
});

describeFixtureParity(getSlackPermalink, slack);

describeFixtureParity(addSlackReaction, slack);

describeFixtureParity(getSlackChannel, {
	...slack,
	cases: {
		channel: {
			allowed: ['POST', 'GET'].map((method) => ({
				path: `requests.${method} ${API}/conversations.info #0`,
				kind: 'intended',
				reason: 'conversations.info reads, so the action sends GET, which the host may retry.',
			})),
			check: (_legacy, next) =>
				expect(next.requests[`GET ${API}/conversations.info #0`]?.query).toEqual({
					channel: 'C0GENERAL1',
				}),
		},
	},
});

describeFixtureParity(getManySlackChannels, slack);

describeFixtureParity(createSlackChannel, slack);

describeFixtureParity(getSlackUser, slack);

const UPLOAD = 'POST https://files.slack.com/upload/v1/ABC #0';

describeFixtureParity(uploadSlackFile, {
	...slack,
	cases: {
		'share in channel': {
			allowed: [
				{
					path: `requests.${UPLOAD}.body`,
					kind: 'intended',
					reason: 'Slack takes the raw bytes; the action streams them instead of a multipart form.',
				},
				{
					path: `requests.${UPLOAD}.headers.content-type`,
					kind: 'intended',
					reason: 'The raw body has the file MIME type, not multipart/form-data.',
				},
			],
			check: (_legacy, next) => {
				expect(next.requests[UPLOAD]?.body).toBe('id,total\n1,42\n');
				expect(next.requests[UPLOAD]?.headers['content-type']).toBe('text/csv');
			},
		},
	},
});
