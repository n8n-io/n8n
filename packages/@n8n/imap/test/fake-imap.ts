import { EventEmitter } from 'events';
import type Imap from 'imap';
import type { Box, MailBoxes } from 'imap';
import { vi } from 'vitest';

import type { ImapTransport } from '../src/imap-simple';

export const box = (total = 0): Box =>
	({ name: 'INBOX', messages: { total, new: 0 } }) as unknown as Box;

/**
 * A node-imap connection that never touches a socket. `connect()` settles on the next tick, so a
 * test can drive `ready` or a failure itself by presetting `connectResult`.
 */
export class FakeImap extends EventEmitter {
	/** How the next `connect()` resolves. */
	connectResult: 'ready' | 'error' | 'close' | 'end' | 'never' = 'ready';

	connectError: Error & { source?: string } = new Error('connect failed');

	/** What every `openBox` answers with, or the error it fails with. */
	mailbox: Box | Error = box();

	readonly connect = vi.fn(() => {
		if (this.connectResult === 'never') return;
		setImmediate(() => {
			if (this.connectResult === 'error') this.emit('error', this.connectError);
			else this.emit(this.connectResult);
		});
	});

	/** A half-open socket never answers LOGOUT, so `close` never follows `end()`. */
	answersLogout = true;

	readonly end = vi.fn(() => {
		if (this.answersLogout) setImmediate(() => this.emit('close', false));
	});

	readonly destroy = vi.fn(() => setImmediate(() => this.emit('close', true)));

	readonly openBox = vi.fn((_name: string, onOpen: (e: Error | null, b?: Box) => void) => {
		setImmediate(() =>
			this.mailbox instanceof Error ? onOpen(this.mailbox) : onOpen(null, this.mailbox),
		);
	});

	readonly search = vi.fn<Imap['search']>();
	readonly fetch = vi.fn<Imap['fetch']>();
	readonly addFlags = vi.fn<Imap['addFlags']>();
	/** node-imap overloads `getBoxes`; only the no-prefix form is ever used here. */
	readonly getBoxes = vi.fn<(onBoxes: (error: Error | null, boxes?: MailBoxes) => void) => void>();

	/** Mimics the server going away: node-imap reports the error first, then the close. */
	drop(error?: Error) {
		if (error) this.emit('error', error);
		this.emit('close', error !== undefined);
	}
}

/** Hands out a fresh transport per attempt, and records them in build order. */
export const transportFactory = (init?: (transport: FakeImap, attempt: number) => void) => {
	const built: FakeImap[] = [];
	const create = (): ImapTransport => {
		const transport = new FakeImap();
		init?.(transport, built.length);
		built.push(transport);
		return transport as unknown as ImapTransport;
	};

	return { built, create, latest: () => built[built.length - 1] };
};

/** Lets pending `setImmediate` callbacks and promise jobs run. */
export const settle = async (times = 3) => {
	for (let i = 0; i < times; i++) await new Promise((resolve) => setImmediate(resolve));
};
