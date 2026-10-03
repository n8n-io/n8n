import { OperationalError, parse, path, ref, t, UserError } from '@n8n/node-sdk';

import { file, slackChannelId, slackPost, slackResponse, slackTs } from '../slack.node';

const slackFile = t.loose(
	t
		.obj({
			id: t.str(),
			title: t.str().optional(),
			name: t.str().optional(),
			permalink: t.str().optional(),
		})
		.with({ additionalProperties: true }),
);

const uploadTarget = slackResponse({ upload_url: t.str(), file_id: t.str() });

const completed = slackResponse({ files: t.arr(slackFile).with({ minItems: 1 }) });

export const uploadSlackFile = file.action('upload', {
	action: 'Upload a file',
	summary: 'Upload a file of the input item, and share it in a channel when one is given.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['files:write'],
	// files.getUploadURLExternal gives a URL on this host for the bytes.
	egress: { hosts: ['files.slack.com'] },
	input: {
		file: t.binary().hint('A binary of the input item, e.g. (item) => item.binary.data'),
		channel: ref(slackChannelId).optional(),
		initialComment: t.str().hint('Message text posted with the file').optional(),
		threadTs: slackTs.hint('ts of the parent message, to share the file in its thread').optional(),
		title: t.str().hint('The file name when empty').optional(),
		fileName: t.str().hint('The binary file name when empty').optional(),
	},
	output: slackFile,
	async run({ input, http }) {
		const { meta } = input.file;
		const fileName = input.fileName ?? meta.fileName;
		if (!fileName) throw new UserError('The file has no name. Set fileName.');
		if (meta.bytes === undefined) throw new UserError('The size of the file is not known');
		const query = { filename: fileName, length: meta.bytes };
		const target = parse(
			uploadTarget,
			await http.request({ path: path`/files.getUploadURLExternal`, query }),
		);
		if (!target.upload_url) throw new OperationalError('Slack gave no upload URL for the file');
		await http.request({ method: 'POST', url: target.upload_url, body: input.file });
		const body = {
			files: [{ id: target.file_id, title: input.title ?? fileName }],
			...(input.channel ? { channel_id: input.channel } : {}),
			...(input.initialComment ? { initial_comment: input.initialComment } : {}),
			...(input.threadTs ? { thread_ts: input.threadTs } : {}),
		};
		const { files } = await slackPost(http, path`/files.completeUploadExternal`, body, completed);
		return files?.[0] ?? {};
	},
});
