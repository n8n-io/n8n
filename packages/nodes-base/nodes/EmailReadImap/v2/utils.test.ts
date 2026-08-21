/* eslint-disable @typescript-eslint/naming-convention -- keys are wire header names */
import { ImapSimple, type ImapTransport } from '@n8n/imap';
import type {
	IBinaryData,
	IDataObject,
	INode,
	INodeExecutionData,
	ITriggerFunctions,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getNewEmails } from './utils';
import {
	BOTH_BODIES,
	bodyOf,
	FakeImapFlow,
	PLAIN_ONLY,
	WITH_ATTACHMENTS,
	type Fixture,
} from '../test/fake-imap-flow';

/** A fake transport never dials, but `connect` still wants somewhere to point. */
const NOWHERE = {
	host: 'imap.test',
	port: 993,
	secure: true,
	user: 'user',
	password: 'password',
};

interface Params {
	format: string;
	downloadAttachments?: boolean;
	typeVersion?: number;
}

/** Drives the real ImapSimple, so MIME-part selection, attachment naming and header parsing are live. */
const run = async (mailbox: Fixture[], params: Params, postProcessAction = 'nothing') => {
	const client = new FakeImapFlow(mailbox);
	const connection = await ImapSimple.connect(
		NOWHERE,
		undefined,
		() => client as unknown as ImapTransport,
	);

	const trigger = mockDeep<ITriggerFunctions>();
	trigger.getNode.mockReturnValue({ typeVersion: params.typeVersion ?? 2.2 } as INode);
	trigger.getWorkflowStaticData.mockReturnValue({});
	trigger.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'format') return params.format;
		if (name === 'downloadAttachments') return params.downloadAttachments ?? false;
		if (name === 'dataPropertyAttachmentsPrefixName') return 'attachment_';
		return undefined;
	});
	trigger.helpers.prepareBinaryData.mockImplementation(
		async (data: Buffer | Readable, fileName?: string, mimeType?: string) =>
			({
				data: Buffer.isBuffer(data) ? data.toString('utf8') : '',
				fileName,
				mimeType,
			}) as unknown as IBinaryData,
	);

	const batches: INodeExecutionData[][] = [];

	await getNewEmails.call(trigger, {
		imapConnection: connection,
		searchCriteria: ['UNSEEN'],
		postProcessAction,
		onEmailBatch: async (data) => {
			batches.push(data);
		},
	});

	return { client, batches, emitted: batches.flat() };
};

describe('getNewEmails output', () => {
	describe('format: simple', () => {
		it('splits headers into top-level fields and metadata, and downloads both bodies', async () => {
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
						attributes: { uid: 101 },
					},
				},
			]);
		});

		it('picks the matching part out of a multipart/alternative', async () => {
			const { emitted } = await run([BOTH_BODIES], { format: 'simple' });

			expect(emitted[0].json).toMatchObject({
				textHtml: '<p>HTML body 102</p>\r\n',
				textPlain: 'Plain body 102\r\n',
			});
		});

		it('names attachments by their position among the attachment parts', async () => {
			const { emitted } = await run([WITH_ATTACHMENTS], {
				format: 'simple',
				downloadAttachments: true,
			});

			expect(emitted[0].json).toMatchObject({
				textHtml: '<p>HTML body 103</p>\r\n',
				textPlain: 'Plain body 103\r\n',
			});
			expect(emitted[0].binary).toStrictEqual({
				attachment_0: { data: 'invoice', fileName: 'invoice.pdf', mimeType: 'application/pdf' },
				attachment_1: { data: 'png', fileName: 'résumé.png', mimeType: 'image/png' },
				attachment_2: { data: 'notes', fileName: 'notes-café.txt', mimeType: 'text/plain' },
			});
		});

		it('omits binary entirely when attachments are not requested', async () => {
			const { emitted } = await run([WITH_ATTACHMENTS], { format: 'simple' });

			expect(emitted[0].binary).toBeUndefined();
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

			expect(emitted[0].json).toMatchObject({
				subject: 'With attachments',
				text: 'Plain body 103',
				html: '<p>HTML body 103</p>',
				attributes: { uid: 103 },
			});
			expect(emitted[0].binary).toStrictEqual({
				attachment_0: { data: 'invoice', fileName: 'invoice.pdf', mimeType: 'application/pdf' },
				attachment_1: { data: 'png', fileName: 'résumé.png', mimeType: 'image/png' },
				attachment_2: { data: 'notes', fileName: 'notes-café.txt', mimeType: 'text/plain' },
			});
		});

		it('returns the mail date as an ISO string on version 2.2', async () => {
			const { emitted } = await run([PLAIN_ONLY], { format: 'resolved', typeVersion: 2.2 });

			expect(emitted[0].json.date).toBe('2020-01-01T12:00:00.000Z');
		});

		it('keeps the mail date as a Date object before version 2.2', async () => {
			const { emitted } = await run([PLAIN_ONLY], { format: 'resolved', typeVersion: 2.1 });

			expect(emitted[0].json.date).toBeInstanceOf(Date);
		});
	});

	describe('post-processing', () => {
		it('flags every emitted message as seen', async () => {
			const { client } = await run([PLAIN_ONLY, BOTH_BODIES], { format: 'raw' }, 'read');

			expect(client.flagsAdded).toEqual([{ range: '101,102', flags: ['\\SEEN'] }]);
		});

		it('leaves flags alone otherwise', async () => {
			const { client } = await run([PLAIN_ONLY], { format: 'raw' });

			expect(client.flagsAdded).toEqual([]);
		});
	});
});

describe('getNewEmails UID tracking', () => {
	const trigger = mockDeep<ITriggerFunctions>();

	afterEach(() => vi.resetAllMocks());

	/** Bypasses ImapSimple so a search can answer with a hand-built list of messages. */
	const fetchSimple = async (
		searches: Array<Array<{ uid: number; headers?: Buffer }>>,
		staticData: IDataObject,
		postProcessAction = 'nothing',
	) => {
		const connection = mock<ImapSimple>({
			search: searches.reduce(
				(search, result) => search.mockResolvedValueOnce(result),
				vi.fn().mockResolvedValue([]),
			),
		});

		trigger.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		trigger.getNodeParameter.calledWith('format').mockReturnValue('simple');
		trigger.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
		trigger.getWorkflowStaticData.mockReturnValue(staticData);

		const batches: number[][] = [];
		await getNewEmails.call(trigger, {
			imapConnection: connection,
			searchCriteria: ['UNSEEN'],
			postProcessAction,
			onEmailBatch: async (data) => {
				batches.push(
					data.map((item) => (item.json.attributes as { uid: number } | undefined)?.uid ?? -1),
				);
			},
		});

		return { connection, batches };
	};

	const headers = (from: string) => Buffer.from(`From: ${from}\r\n\r\n`);

	it('skips a message whose HEADER part is missing', async () => {
		const { batches } = await fetchSimple([[{ uid: 900 }]], {});

		expect(batches).toEqual([[]]);
		expect(trigger.logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('HEADER part missing'),
		);
	});

	it('only marks the messages it emitted as read', async () => {
		const { connection, batches } = await fetchSimple(
			[
				[
					{ uid: 870, headers: headers('a@b.com') },
					{ uid: 873, headers: headers('b@b.com') },
					{ uid: 875, headers: headers('c@b.com') },
				],
			],
			{ lastMessageUid: 873 },
			'read',
		);

		expect(connection.addFlags).toHaveBeenCalledExactlyOnceWith([875], ['\\SEEN']);
		expect(batches).toEqual([[875]]);
	});

	it('does not mark anything as read when every message is filtered out', async () => {
		const { connection, batches } = await fetchSimple(
			[[{ uid: 873, headers: headers('a@b.com') }]],
			{ lastMessageUid: 873 },
			'read',
		);

		expect(connection.addFlags).not.toHaveBeenCalled();
		expect(batches).toEqual([[]]);
	});

	it('advances lastMessageUid before emitting, so n8n persists it with the batch', async () => {
		const staticData: IDataObject = {};
		const seenWhileEmitting: unknown[] = [];
		const connection = mock<ImapSimple>({
			search: vi.fn().mockResolvedValueOnce([{ uid: 873, headers: headers('a@b.com') }]),
		});

		trigger.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		trigger.getNodeParameter.calledWith('format').mockReturnValue('simple');
		trigger.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
		trigger.getWorkflowStaticData.mockReturnValue(staticData);

		await getNewEmails.call(trigger, {
			imapConnection: connection,
			searchCriteria: ['UNSEEN'],
			postProcessAction: 'nothing',
			onEmailBatch: async () => {
				seenWhileEmitting.push(staticData.lastMessageUid);
			},
		});

		expect(seenWhileEmitting).toEqual([873]);
	});

	it('advances lastMessageUid between batches so a message is emitted once', async () => {
		const staticData: IDataObject = {};
		const firstBatch = Array.from({ length: 20 }, (_, i) => ({
			uid: i + 1,
			headers: headers(`user${i}@test.com`),
		}));
		const secondBatch = [
			{ uid: 20, headers: headers('user20@test.com') },
			{ uid: 21, headers: headers('user21@test.com') },
		];

		const { batches } = await fetchSimple([firstBatch, secondBatch], staticData);

		expect(batches[0]).toHaveLength(20);
		expect(batches[1]).toEqual([21]);
		expect(staticData.lastMessageUid).toBe(21);
	});
});
