import type { Arrival, CloseReason, ImapSimple as Connection, Message } from '@n8n/imap';
import { ImapSimple } from '@n8n/imap';
import type { IDataObject, INode, INodeTypeBaseDescription, ITriggerFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV1 } from './EmailReadImapV1.node';

vi.mock('@n8n/imap', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/imap')>()),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	ImapSimple: { connect: vi.fn() },
}));

const message = (uid: number): Message =>
	({
		attributes: { uid, struct: [] },
		parts: [
			{ which: '', body: 'Subject: Hello\r\n\r\nBody' },
			{ which: 'HEADER', body: { from: ['a@b.com'], 'x-custom': ['kept'] } },
			{ which: 'TEXT', body: 'raw-body' },
		],
	}) as unknown as Message;

describe('EmailReadImapV1', () => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Email Trigger (IMAP)',
		name: 'emailReadImap',
		group: ['trigger'],
		description: 'Triggers on new email',
	};

	const credentials: ICredentialsDataImap = {
		host: 'imap.test.com',
		port: 993,
		user: 'user',
		password: 'password',
		secure: true,
		allowUnauthorizedCerts: false,
	};

	let staticData: IDataObject;
	let triggerFunctions: DeepMockProxy<ITriggerFunctions>;
	let connection: Connection;
	let arrival: ((arrival: Arrival) => Promise<void>) | undefined;
	let onError: ((error: Error) => void) | undefined;
	let onClose: ((reason: CloseReason, cause?: Error) => void) | undefined;

	const trigger = async (params: IDataObject = {}) => {
		triggerFunctions.getNodeParameter.mockImplementation(
			((param: string) =>
				({
					mailbox: 'INBOX',
					postProcessAction: 'nothing',
					options: {},
					format: 'raw',
					downloadAttachments: false,
					dataPropertyAttachmentsPrefixName: 'attachment_',
					...params,
				})[param]) as never,
		);

		return await new EmailReadImapV1(baseDescription).trigger.call(triggerFunctions);
	};

	beforeEach(() => {
		staticData = {};
		arrival = undefined;
		onError = undefined;
		onClose = undefined;

		connection = {
			onArrival: vi.fn((h) => ((arrival = h), connection)),
			onError: vi.fn((h) => ((onError = h), connection)),
			onClose: vi.fn((h) => ((onClose = h), connection)),
			onReconnect: vi.fn(() => connection),
			search: vi.fn().mockResolvedValue([message(7)]),
			downloadText: vi.fn().mockResolvedValue('text'),
			downloadAttachments: vi.fn().mockResolvedValue([]),
			addFlags: vi.fn().mockResolvedValue(undefined),
			end: vi.fn(),
			endedByCaller: false,
		} as unknown as Connection;
		vi.mocked(ImapSimple.connect).mockResolvedValue(connection);

		triggerFunctions = mockDeep<ITriggerFunctions>({
			helpers: {
				createDeferredPromise: () => {
					let resolve!: () => void;
					const promise = new Promise<void>((res) => (resolve = res));
					return { promise, resolve, reject: vi.fn() } as never;
				},
			},
		});
		triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
		triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
	});

	afterEach(() => vi.clearAllMocks());

	it('returns a close function that ends the connection', async () => {
		const { closeFunction } = await trigger();

		await closeFunction?.();

		expect(connection.end).toHaveBeenCalled();
	});

	it('watches the mailbox it was configured with', async () => {
		await trigger();

		expect(ImapSimple.connect).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'imap.test.com', secure: true }),
			expect.objectContaining({ mailbox: 'INBOX' }),
		);
	});

	it('takes the certificate option from the node, not the credential', async () => {
		await trigger({ options: { allowUnauthorizedCerts: true } });

		expect(ImapSimple.connect).toHaveBeenCalledWith(
			expect.objectContaining({ allowUnauthorizedCerts: true }),
			expect.anything(),
		);
	});

	it('emits an error the connection could not recover from', async () => {
		await trigger();
		const error = new Error('gone for good');

		onError?.(error);
		// `emitError` is held back until the workflow is active, so it lands a microtask later.
		await new Promise((resolve) => setImmediate(resolve));

		expect(triggerFunctions.emitError).toHaveBeenCalledWith(error);
	});

	it('emits an actionable error when the server closes without explanation', async () => {
		await trigger();

		onClose?.('dropped', new Error('reconnect timed out'));

		const emitted = triggerFunctions.emitError.mock.calls[0][0] as NodeOperationError;
		expect(emitted).toBeInstanceOf(NodeOperationError);
		expect(emitted.message).toBe('IMAP connection closed unexpectedly');
		expect(emitted.description).toContain('closes long-lived connections');
	});

	it.each(['ended', 'error'] as const)('stays quiet on a %s close', async (reason) => {
		await trigger();

		onClose?.(reason);

		expect(triggerFunctions.emitError).not.toHaveBeenCalled();
	});

	describe('formats', () => {
		const emitted = () => triggerFunctions.emit.mock.calls[0][0][0];

		it('emits the raw body', async () => {
			await trigger({ format: 'raw' });

			await arrival?.({ count: 1 });

			expect(emitted()).toEqual([{ json: { raw: 'raw-body' } }]);
		});

		it('splits headers into top-level fields and metadata', async () => {
			await trigger({ format: 'simple' });

			await arrival?.({ count: 1 });

			expect(emitted()).toEqual([
				{
					json: {
						textHtml: 'text',
						textPlain: 'text',
						from: 'a@b.com',
						metadata: { 'x-custom': 'kept' },
					},
				},
			]);
		});

		it('attaches downloaded attachments under the configured prefix', async () => {
			vi.mocked(connection.downloadAttachments).mockResolvedValue([
				{ filename: 'a.pdf', content: Buffer.from('pdf') },
			]);
			triggerFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: 'cGRm',
				mimeType: 'application/pdf',
			});

			await trigger({ format: 'simple', downloadAttachments: true });
			await arrival?.({ count: 1 });

			expect(emitted()[0].binary).toEqual({
				attachment_0: { data: 'cGRm', mimeType: 'application/pdf' },
			});
		});
	});

	describe('post-processing', () => {
		it('marks every message it fetched as read', async () => {
			await trigger({ postProcessAction: 'read' });

			await arrival?.({ count: 1 });

			expect(connection.addFlags).toHaveBeenCalledWith([7], '\\SEEN');
		});

		it('leaves messages untouched when asked to do nothing', async () => {
			await trigger({ postProcessAction: 'nothing' });

			await arrival?.({ count: 1 });

			expect(connection.addFlags).not.toHaveBeenCalled();
		});

		it('skips mail it has already seen', async () => {
			staticData.lastMessageUid = 7;
			await trigger();

			await arrival?.({ count: 1 });

			expect(triggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('remembers the highest UID it processed', async () => {
			await trigger();

			await arrival?.({ count: 1 });

			expect(staticData.lastMessageUid).toBe(7);
		});
	});
});
