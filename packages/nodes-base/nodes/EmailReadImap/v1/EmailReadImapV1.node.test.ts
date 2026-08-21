/* eslint-disable @typescript-eslint/naming-convention -- keys are wire header names */
import { ImapSimple, type ImapTransport } from '@n8n/imap';
import type {
	IBinaryData,
	IDataObject,
	INode,
	INodeTypeBaseDescription,
	ITriggerFunctions,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { mockDeep } from 'vitest-mock-extended';

import type { ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV1 } from './EmailReadImapV1.node';
import {
	BOTH_BODIES,
	bodyOf,
	FakeImapFlow,
	PLAIN_ONLY,
	WITH_ATTACHMENTS,
	type Fixture,
} from '../test/fake-imap-flow';

/** Captured before any spy, so a stubbed `connect` does not recurse into itself. */
const openDirectly = ImapSimple.connect.bind(ImapSimple);

/** A fake transport never dials, but `connect` still wants somewhere to point. */
const NOWHERE = {
	host: 'imap.test',
	port: 993,
	secure: true,
	user: 'user',
	password: 'password',
};

/**
 * v1 keeps its own copy of the per-format loop, so it needs covering separately from v2. The
 * mailbox reaches it through the real ImapSimple, driven by an arrival the fake server reports.
 */

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'EmailReadImapV1',
	name: 'emailReadImap',
	group: ['trigger'],
	description: 'Test',
};

const credentials: ICredentialsDataImap = {
	host: 'imap.test.com',
	port: 993,
	user: 'user',
	password: 'password',
	secure: false,
	allowUnauthorizedCerts: false,
};

const run = async (
	mailbox: Fixture[],
	params: { format: string; downloadAttachments?: boolean; postProcessAction?: string },
) => {
	const client = new FakeImapFlow(mailbox);
	const connect = vi
		.spyOn(ImapSimple, 'connect')
		.mockImplementation(
			async (_options, reconnect) =>
				await openDirectly(NOWHERE, reconnect, () => client as unknown as ImapTransport),
		);

	const trigger = mockDeep<ITriggerFunctions>();
	trigger.getCredentials.mockResolvedValue(credentials as unknown as IDataObject);
	trigger.getNode.mockReturnValue({ typeVersion: 1 } as INode);
	trigger.getWorkflowStaticData.mockReturnValue({});
	trigger.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'format') return params.format;
		if (name === 'mailbox') return 'INBOX';
		if (name === 'postProcessAction') return params.postProcessAction ?? 'nothing';
		if (name === 'options') return {};
		if (name === 'downloadAttachments') return params.downloadAttachments ?? false;
		if (name === 'dataPropertyAttachmentsPrefixName') return 'attachment_';
		return undefined;
	});
	trigger.helpers.createDeferredPromise.mockImplementation(() => {
		let resolve!: () => void;
		const promise = new Promise<void>((res) => {
			resolve = res;
		});
		return { promise, resolve, reject: () => {} } as ReturnType<
			ITriggerFunctions['helpers']['createDeferredPromise']
		>;
	});
	trigger.helpers.prepareBinaryData.mockImplementation(
		async (data: Buffer | Readable, fileName?: string, mimeType?: string) =>
			({
				data: Buffer.isBuffer(data) ? data.toString('utf8') : '',
				fileName,
				mimeType,
			}) as unknown as IBinaryData,
	);

	const node = new EmailReadImapV1(baseDescription);
	const response = await node.trigger.call(trigger);

	client.emit('exists', { path: 'INBOX', count: mailbox.length, prevCount: 0 });
	await vi.waitFor(() => expect(trigger.emit).toHaveBeenCalled());
	await response?.closeFunction?.();
	connect.mockRestore();

	const emitted = trigger.emit.mock.calls.flatMap((call) => call[0][0]);

	return { client, emitted };
};

describe('EmailReadImapV1 output', () => {
	describe('format: simple', () => {
		it('splits headers into top-level fields and metadata, without an attributes key', async () => {
			const { emitted } = await run([PLAIN_ONLY], { format: 'simple' });

			expect(emitted).toEqual([
				{
					json: {
						textHtml: '',
						textPlain: 'Plain body 101\r\n',
						metadata: {
							'message-id': '<101@example.com>',
							'mime-version': '1.0',
							'content-type': 'text/plain; charset=UTF-8',
							'content-transfer-encoding': '7bit',
						},
						from: 'alice@example.com',
						to: 'bob@example.com',
						subject: 'Plain only',
						date: 'Wed, 01 Jan 2020 12:00:00 +0000',
					},
				},
			]);
		});

		it('names attachments by their position among the attachment parts', async () => {
			const { emitted } = await run([WITH_ATTACHMENTS], {
				format: 'simple',
				downloadAttachments: true,
			});

			expect(emitted[0].binary).toStrictEqual({
				attachment_0: { data: 'invoice', fileName: 'invoice.pdf', mimeType: 'application/pdf' },
				attachment_1: { data: 'png', fileName: 'résumé.png', mimeType: 'image/png' },
				attachment_2: { data: 'notes', fileName: 'notes-café.txt', mimeType: 'text/plain' },
			});
		});
	});

	describe('format: raw', () => {
		it('returns the body as the server sent it', async () => {
			const { emitted } = await run([BOTH_BODIES], { format: 'raw' });

			expect(emitted).toEqual([{ json: { raw: bodyOf(BOTH_BODIES) } }]);
		});
	});

	describe('format: resolved', () => {
		it('names mailparser attachments by position, with decoded filenames', async () => {
			const { emitted } = await run([WITH_ATTACHMENTS], { format: 'resolved' });

			expect(emitted[0].json).toMatchObject({ subject: 'With attachments' });
			expect(emitted[0].binary).toStrictEqual({
				attachment_0: { data: 'invoice', fileName: 'invoice.pdf', mimeType: 'application/pdf' },
				attachment_1: { data: 'png', fileName: 'résumé.png', mimeType: 'image/png' },
				attachment_2: { data: 'notes', fileName: 'notes-café.txt', mimeType: 'text/plain' },
			});
		});
	});

	describe('post-processing', () => {
		it('flags every fetched message as seen', async () => {
			const { client } = await run([PLAIN_ONLY, BOTH_BODIES], {
				format: 'raw',
				postProcessAction: 'read',
			});

			expect(client.flagsAdded).toEqual([{ range: '101,102', flags: ['\\SEEN'] }]);
		});
	});
});
