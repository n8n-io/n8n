import { EventEmitter } from 'events';
import Imap, { type Box, type MailBoxes } from 'imap';
import { Readable } from 'stream';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ImapSimple } from './imap-simple';
import { PartData } from './part-data';

type MockImap = EventEmitter & {
	connect: Mocked<() => unknown>;
	fetch: Mocked<() => unknown>;
	end: Mocked<() => unknown>;
	search: Mocked<(...args: Parameters<Imap['search']>) => unknown>;
	sort: Mocked<(...args: Parameters<Imap['sort']>) => unknown>;
	openBox: Mocked<
		(boxName: string, onOpen: (error: Error | null, box?: Box) => unknown) => unknown
	>;
	closeBox: Mocked<(...args: Parameters<Imap['closeBox']>) => unknown>;
	getBoxes: Mocked<(onBoxes: (error: Error | null, boxes?: MailBoxes) => unknown) => unknown>;
	addFlags: Mocked<(...args: Parameters<Imap['addFlags']>) => unknown>;
};

vi.mock('imap', () => {
	return {
		default: class InlineMockImap extends EventEmitter implements MockImap {
			connect = vi.fn();
			fetch = vi.fn();
			end = vi.fn();
			search = vi.fn();
			sort = vi.fn();
			openBox = vi.fn();
			closeBox = vi.fn();
			addFlags = vi.fn();
			getBoxes = vi.fn();
		},
	};
});

vi.mock('./part-data', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	PartData: { fromData: vi.fn(() => 'decoded') },
}));

describe('ImapSimple', () => {
	function createImap() {
		const imap = new Imap({ user: 'testuser', password: 'testpass' });
		return { imapSimple: new ImapSimple(imap), mockImap: imap as unknown as MockImap };
	}

	describe('constructor', () => {
		it('should forward nonerror events', () => {
			const { imapSimple, mockImap } = createImap();
			const onMail = vi.fn();
			imapSimple.on('mail', onMail);
			mockImap.emit('mail', 3);
			expect(onMail).toHaveBeenCalledWith(3);
		});

		it('should suppress ECONNRESET errors if ending', () => {
			const { imapSimple, mockImap } = createImap();
			const onError = vi.fn();
			imapSimple.on('error', onError);
			imapSimple.end();

			mockImap.emit('error', { message: 'reset', code: 'ECONNRESET' });
			expect(onError).not.toHaveBeenCalled();
		});

		it('should forward ECONNRESET errors if not ending', () => {
			const { imapSimple, mockImap } = createImap();
			const onError = vi.fn();
			imapSimple.on('error', onError);

			const error = { message: 'reset', code: 'ECONNRESET' };
			mockImap.emit('error', error);
			expect(onError).toHaveBeenCalledWith(error);
		});
	});

	describe('search', () => {
		it('should resolve with messages returned from fetch', async () => {
			const { imapSimple, mockImap } = createImap();

			const fetchEmitter = new EventEmitter();
			const mockMessages = [{ uid: 1 }, { uid: 2 }, { uid: 3 }];
			vi.mocked(mockImap.search).mockImplementation((_criteria, onResult) =>
				onResult(
					null as unknown as Error,
					mockMessages.map((m) => m.uid),
				),
			);
			mockImap.fetch = vi.fn(() => fetchEmitter);

			const searchPromise = imapSimple.search(['UNSEEN', ['FROM', 'test@n8n.io']], {
				bodies: ['BODY'],
			});
			expect(mockImap.search).toHaveBeenCalledWith(
				['UNSEEN', ['FROM', 'test@n8n.io']],
				expect.any(Function),
			);

			for (const message of mockMessages) {
				const messageEmitter = new EventEmitter();
				const body = 'body' + message.uid;
				const bodyStream = Readable.from(body);
				fetchEmitter.emit('message', messageEmitter, message.uid);
				messageEmitter.emit('body', bodyStream, { which: 'TEXT', size: Buffer.byteLength(body) });
				messageEmitter.emit('attributes', { uid: message.uid });
				await new Promise((resolve) => {
					bodyStream.on('end', resolve);
				});
				messageEmitter.emit('end');
			}

			fetchEmitter.emit('end');

			const messages = await searchPromise;

			expect(messages).toEqual([
				{
					attributes: { uid: 1 },
					parts: [{ body: 'body1', size: 5, which: 'TEXT' }],
					seqNo: 1,
				},
				{
					attributes: { uid: 2 },
					parts: [{ body: 'body2', size: 5, which: 'TEXT' }],
					seqNo: 2,
				},
				{
					attributes: { uid: 3 },
					parts: [{ body: 'body3', size: 5, which: 'TEXT' }],
					seqNo: 3,
				},
			]);
		});
	});

	describe('getPartData', () => {
		it('should return decoded part data', async () => {
			const { imapSimple, mockImap } = createImap();

			const fetchEmitter = new EventEmitter();
			mockImap.fetch = vi.fn(() => fetchEmitter);

			const message = { attributes: { uid: 123 } };
			const part = { partID: '1.2', encoding: 'BASE64' };

			const partDataPromise = imapSimple.getPartData(mock(message), mock(part));

			const body = 'encoded-body';
			const messageEmitter = new EventEmitter();
			const bodyStream = Readable.from(body);

			fetchEmitter.emit('message', messageEmitter);

			messageEmitter.emit('body', bodyStream, {
				which: part.partID,
				size: Buffer.byteLength(body),
			});
			messageEmitter.emit('attributes', {});
			await new Promise((resolve) => bodyStream.on('end', resolve));
			messageEmitter.emit('end');

			fetchEmitter.emit('end');

			const result = await partDataPromise;
			expect(PartData.fromData).toHaveBeenCalledWith('encoded-body', 'BASE64');
			expect(result).toBe('decoded');
		});
	});

	describe('openBox', () => {
		it('should open the mailbox', async () => {
			const { imapSimple, mockImap } = createImap();
			const box = mock<Box>({ name: 'INBOX' });
			vi.mocked(mockImap.openBox).mockImplementation((_boxName, onOpen) =>
				onOpen(null as unknown as Error, box),
			);
			await expect(imapSimple.openBox('INBOX')).resolves.toEqual(box);
		});

		it('should reject on error', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.openBox).mockImplementation((_boxName, onOpen) =>
				onOpen(new Error('nope')),
			);
			await expect(imapSimple.openBox('INBOX')).rejects.toThrow('nope');
		});
	});

	describe('closeBox', () => {
		it('should close the mailbox with default autoExpunge=true', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.closeBox).mockImplementation((_expunge, onClose) =>
				onClose(null as unknown as Error),
			);
			await expect(imapSimple.closeBox()).resolves.toBeUndefined();
			expect(mockImap.closeBox).toHaveBeenCalledWith(true, expect.any(Function));
		});

		it('should close the mailbox with autoExpunge=false', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.closeBox).mockImplementation((_expunge, onClose) =>
				onClose(null as unknown as Error),
			);
			await expect(imapSimple.closeBox(false)).resolves.toBeUndefined();
			expect(mockImap.closeBox).toHaveBeenCalledWith(false, expect.any(Function));
		});

		it('should reject on error', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.closeBox).mockImplementation((_expunge, onClose) =>
				onClose(new Error('fail')),
			);
			await expect(imapSimple.closeBox()).rejects.toThrow('fail');
		});
	});

	describe('addFlags', () => {
		it('should add flags to messages and resolve', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.addFlags).mockImplementation((_uids, _flags, onAdd) =>
				onAdd(null as unknown as Error),
			);

			await expect(imapSimple.addFlags([1, 2], ['\\Seen'])).resolves.toBeUndefined();
			expect(mockImap.addFlags).toHaveBeenCalledWith([1, 2], ['\\Seen'], expect.any(Function));
		});

		it('should reject on error', async () => {
			const { imapSimple, mockImap } = createImap();
			vi.mocked(mockImap.addFlags).mockImplementation((_uids, _flags, onAdd) =>
				onAdd(new Error('add flags failed')),
			);

			await expect(imapSimple.addFlags([1], '\\Seen')).rejects.toThrow('add flags failed');
		});
	});

	describe('getBoxes', () => {
		it('should resolve with list of mailboxes', async () => {
			const { imapSimple, mockImap } = createImap();
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const boxes = mock<MailBoxes>({ INBOX: {}, Archive: {} });

			vi.mocked(mockImap.getBoxes).mockImplementation((onBoxes) =>
				onBoxes(null as unknown as Error, boxes),
			);

			await expect(imapSimple.getBoxes()).resolves.toEqual(boxes);
			expect(mockImap.getBoxes).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should reject on error', async () => {
			const { imapSimple, mockImap } = createImap();

			vi.mocked(mockImap.getBoxes).mockImplementation((onBoxes) =>
				onBoxes(new Error('getBoxes failed')),
			);

			await expect(imapSimple.getBoxes()).rejects.toThrow('getBoxes failed');
		});
	});
});
