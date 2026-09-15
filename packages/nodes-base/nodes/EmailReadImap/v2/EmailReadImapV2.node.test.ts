import type { Arrival, CloseReason, ImapSimple as Connection } from '@n8n/imap';
import { ImapSimple } from '@n8n/imap';
import type { IDataObject, INode, INodeTypeBaseDescription, ITriggerFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV2 } from './EmailReadImapV2.node';
import { getNewEmails } from './utils';

vi.mock('@n8n/imap', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/imap')>()),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	ImapSimple: { connect: vi.fn() },
}));

vi.mock('./utils', () => ({ getNewEmails: vi.fn().mockResolvedValue(undefined) }));

/** Stands in for a live connection, handing the test the handlers the node registered. */
const fakeConnection = () => {
	const handlers: {
		arrival?: (arrival: Arrival) => Promise<void>;
		error?: (error: Error) => void;
		close?: (reason: CloseReason) => void;
		reconnect?: () => void;
	} = {};

	const connection = {
		onArrival: vi.fn((h) => ((handlers.arrival = h), connection)),
		onError: vi.fn((h) => ((handlers.error = h), connection)),
		onClose: vi.fn((h) => ((handlers.close = h), connection)),
		onReconnect: vi.fn((h) => ((handlers.reconnect = h), connection)),
		onFlags: vi.fn(() => connection),
		end: vi.fn(),
		endedByCaller: false,
	} as unknown as Connection;

	return { connection, handlers };
};

/** `emitError` is held back until the workflow is active, so it lands a microtask later. */
const flush = async () => await new Promise((resolve) => setImmediate(resolve));

describe('EmailReadImapV2', () => {
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
		secure: false,
		allowUnauthorizedCerts: false,
	};

	let staticData: IDataObject;
	let triggerFunctions: DeepMockProxy<ITriggerFunctions>;
	let fake: ReturnType<typeof fakeConnection>;

	const trigger = async (options: IDataObject = {}) => {
		triggerFunctions.getNodeParameter.mockImplementation(
			((param: string) =>
				({ mailbox: 'INBOX', postProcessAction: 'nothing', options })[param]) as never,
		);

		return await new EmailReadImapV2(baseDescription).trigger.call(triggerFunctions);
	};

	beforeEach(() => {
		staticData = {};
		fake = fakeConnection();
		vi.mocked(ImapSimple.connect).mockResolvedValue(fake.connection);

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
		triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
	});

	afterEach(() => vi.clearAllMocks());

	it('returns a close function that ends the connection', async () => {
		const { closeFunction } = await trigger();

		expect(closeFunction).toBeDefined();
		await closeFunction?.();
		expect(fake.connection.end).toHaveBeenCalled();
	});

	it('watches the mailbox it was configured with', async () => {
		await trigger();

		expect(ImapSimple.connect).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'imap.test.com' }),
			expect.objectContaining({ mailbox: 'INBOX' }),
		);
	});

	it('turns the force-reconnect option into a replacement interval', async () => {
		await trigger({ forceReconnect: 5 });

		expect(ImapSimple.connect).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ interval: 300_000 }),
		);
	});

	it('leaves the interval unset when force-reconnect is off', async () => {
		await trigger();

		expect(ImapSimple.connect).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ interval: undefined }),
		);
	});

	describe('failures', () => {
		it('emits an error the connection could not recover from', async () => {
			await trigger();
			const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });

			fake.handlers.error?.(error);
			await flush();

			expect(triggerFunctions.emitError).toHaveBeenCalledWith(error);
		});

		it('emits an actionable error when the server closes without explanation', async () => {
			await trigger();

			fake.handlers.close?.('dropped');

			const emitted = triggerFunctions.emitError.mock.calls[0][0] as NodeOperationError;
			expect(emitted).toBeInstanceOf(NodeOperationError);
			expect(emitted.message).toBe('IMAP connection closed unexpectedly');
			expect(emitted.description).toContain('closes long-lived connections');
		});

		it.each(['ended', 'error'] as const)('stays quiet on a %s close', async (reason) => {
			await trigger();

			fake.handlers.close?.(reason);

			expect(triggerFunctions.emitError).not.toHaveBeenCalled();
		});

		it('leaves a fetch failure to the connection to recover from', async () => {
			vi.mocked(getNewEmails).mockRejectedValueOnce(new Error('fetch failed'));
			await trigger();

			await expect(fake.handlers.arrival?.({ count: 1 })).rejects.toThrow('fetch failed');
			await flush();

			expect(triggerFunctions.emitError).not.toHaveBeenCalled();
		});

		it('says nothing about a fetch the caller cut short', async () => {
			vi.mocked(getNewEmails).mockRejectedValueOnce(new Error('fetch failed'));
			await trigger();
			Object.assign(fake.connection, { endedByCaller: true });

			await fake.handlers.arrival?.({ count: 1 });
			await flush();

			expect(triggerFunctions.emitError).not.toHaveBeenCalled();
		});
	});

	describe('search criteria', () => {
		const criteriaOf = (call: number) => vi.mocked(getNewEmails).mock.calls[call][0].searchCriteria;

		it('narrows to mail newer than the last one seen', async () => {
			staticData.lastMessageUid = 42;
			await trigger();

			await fake.handlers.arrival?.({ count: 1 });

			expect(criteriaOf(0)).toEqual(['UNSEEN', ['UID', '42:*']]);
		});

		it('does not accumulate UID filters across arrivals', async () => {
			vi.mocked(getNewEmails).mockImplementation(async function (this: ITriggerFunctions) {
				const data = this.getWorkflowStaticData('node');
				data.lastMessageUid = ((data.lastMessageUid as number) ?? 0) + 1;
			});
			await trigger({ trackLastMessageId: true });

			for (let i = 0; i < 5; i++) await fake.handlers.arrival?.({ count: 1 });

			const last = criteriaOf(4);
			expect(last.filter((c) => Array.isArray(c) && c[0] === 'UID')).toHaveLength(1);
		});
	});
});
