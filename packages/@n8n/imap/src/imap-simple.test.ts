import { EventEmitter } from 'events';
import Imap from 'imap';
import type { Mocked } from 'vitest';

import { ImapSimple } from './imap-simple';
import { Readable } from 'stream';

type MockImap = EventEmitter & {
	connect: Mocked<() => unknown>;
	fetch: Mocked<() => unknown>;
	end: Mocked<() => unknown>;
	search: Mocked<(...args: Parameters<Imap['search']>) => unknown>;
	sort: Mocked<(...args: Parameters<Imap['sort']>) => unknown>;
	openBox: Mocked<() => unknown>;
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
		},
	};
});

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

	describe('sort', () => {
		it('should resolve with messages returned from fetch', async () => {
			const { imapSimple, mockImap } = createImap();

			const fetchEmitter = new EventEmitter();
			const mockMessages = [{ uid: 1 }, { uid: 2 }, { uid: 3 }];
			vi.mocked(mockImap.sort).mockImplementation((_sort, _search, onResult) =>
				onResult(
					null as unknown as Error,
					mockMessages.map((m) => m.uid),
				),
			);
			mockImap.fetch = vi.fn(() => fetchEmitter);

			const sortPromise = imapSimple.sort(['-ARRIVAL'], ['UNSEEN', ['FROM', 'test@n8n.io']], {
				bodies: ['BODY'],
			});
			expect(mockImap.sort).toHaveBeenCalledWith(
				['-ARRIVAL'],
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

			const messages = await sortPromise;

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
});
