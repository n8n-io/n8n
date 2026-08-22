import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INode,
	INodeTypeBaseDescription,
	ITriggerFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV2 } from './EmailReadImapV2.node';
import { getNewEmails } from './utils';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('@n8n/imap', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/imap')>()),
	ImapSimple: { connect: connectMock },
}));
vi.mock('./utils', () => ({ getNewEmails: vi.fn() }));

const fetched = vi.mocked(getNewEmails);

/** Stands in for a connection; the real one's own behaviour is covered in @n8n/imap. */
const createConnection = () => {
	const handlers: {
		arrival?: (arrival: { count: number; prevCount: number }) => Promise<void>;
		error?: (error: Error) => void;
		close?: (reason: 'ended' | 'error' | 'dropped') => void;
		reconnect?: () => void;
		flags?: (event: unknown) => void;
	} = {};

	return {
		handlers,
		endedByCaller: false,
		onArrival(handler: NonNullable<typeof handlers.arrival>) {
			handlers.arrival = handler;
			return this;
		},
		onError(handler: NonNullable<typeof handlers.error>) {
			handlers.error = handler;
			return this;
		},
		onClose(handler: NonNullable<typeof handlers.close>) {
			handlers.close = handler;
			return this;
		},
		onReconnect(handler: NonNullable<typeof handlers.reconnect>) {
			handlers.reconnect = handler;
			return this;
		},
		onFlags(handler: NonNullable<typeof handlers.flags>) {
			handlers.flags = handler;
			return this;
		},
		openBox: vi.fn().mockResolvedValue({}),
		catchUp: vi.fn(),
		end: vi.fn(),
		list: vi.fn().mockResolvedValue([]),
		search: vi.fn().mockResolvedValue([]),
		downloadText: vi.fn(),
		downloadAttachments: vi.fn(),
		addFlags: vi.fn().mockResolvedValue(undefined),
	};
};

/** Delivers an arrival the way the connection would, and waits for the handler to finish. */
const arrive = async (connection: MockConnection, count = 2, prevCount = 1) =>
	await connection.handlers.arrival?.({ count, prevCount });

type MockConnection = ReturnType<typeof createConnection>;

/** The node holds an error back behind a resolved promise, so one microtask is enough. */
const flush = async () => await Promise.resolve();

describe('EmailReadImapV2', () => {
	const staticData: IDataObject = {};

	const triggerFunctions = mock<ITriggerFunctions>({
		helpers: {
			createDeferredPromise: vi.fn().mockImplementation(() => {
				let resolve!: () => void;
				let reject!: (e: Error) => void;
				const promise = new Promise<void>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}),
		},
	});

	const credentials: ICredentialsDataImap = {
		host: 'imap.test.com',
		port: 993,
		user: 'user',
		password: 'password',
		secure: true,
		allowUnauthorizedCerts: false,
	};

	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'EmailReadImapV2',
		name: 'emailReadImapV2',
		icon: 'fa:inbox',
		group: ['trigger'],
		description: 'Test',
	};

	/** Minutes; the node turns this into the connection's replace interval. */
	const FORCE_RECONNECT = 1;
	const RECONNECT_INTERVAL_MS = FORCE_RECONNECT * 60_000;

	const startTrigger = async (options: IDataObject = { forceReconnect: FORCE_RECONNECT }) => {
		triggerFunctions.getNodeParameter.mockImplementation(((param: string) => {
			const values: Record<string, unknown> = {
				mailbox: 'INBOX',
				postProcessAction: 'nothing',
				options,
			};
			return values[param];
		}) as typeof triggerFunctions.getNodeParameter);

		return await new EmailReadImapV2(baseDescription).trigger.call(triggerFunctions);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		Object.keys(staticData).forEach((key) => delete staticData[key]);
		connectMock.mockReset();
		fetched.mockReset().mockResolvedValue(undefined);

		triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
		triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
		triggerFunctions.logger.debug = vi.fn();
		triggerFunctions.logger.error = vi.fn();
		triggerFunctions.logger.warn = vi.fn();
		(triggerFunctions as { emitError: Mock }).emitError = vi.fn();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('arrivals', () => {
		it('leaves an idle mailbox alone', async () => {
			connectMock.mockResolvedValueOnce(createConnection());

			await startTrigger();

			expect(fetched).not.toHaveBeenCalled();
		});

		it('fetches when the connection reports an arrival', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger();

			void arrive(connection, 2, 1);

			await vi.waitFor(() => expect(fetched).toHaveBeenCalled());
		});
	});

	describe('overlapping arrivals', () => {
		it('keeps fetching after one arrival fails', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			fetched.mockRejectedValueOnce(new Error('fetch blew up'));

			await startTrigger({});
			await arrive(connection, 2, 1).catch(() => {});
			await arrive(connection, 3, 2);

			expect(fetched).toHaveBeenCalledTimes(2);
		});
	});

	describe('search criteria', () => {
		it('does not accumulate UID filters across arrivals', async () => {
			const criteriaPerFetch: unknown[][] = [];
			fetched.mockImplementation(async function (this: ITriggerFunctions, { searchCriteria }) {
				criteriaPerFetch.push([...searchCriteria]);
				// Past the first fetch the node takes the UID path rather than the SINCE one.
				const data = this.getWorkflowStaticData('node');
				data.lastMessageUid = ((data.lastMessageUid as number) ?? 0) + 1;
			});

			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger({ trackLastMessageId: true });

			for (let i = 0; i < 11; i++) {
				void arrive(connection, 2, 1);
				await vi.waitFor(() => expect(criteriaPerFetch).toHaveLength(i + 1));
			}

			const last = criteriaPerFetch[criteriaPerFetch.length - 1];
			expect(last.filter((c) => Array.isArray(c) && c[0] === 'UID')).toHaveLength(1);
		});
	});

	describe('a connection that fails', () => {
		it('reports the error to the error workflow', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger();

			const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
			connection.handlers.error?.(error);
			await flush();

			expect(triggerFunctions.emitError).toHaveBeenCalledWith(error);
		});

		it('reports an actionable error when the server closes without one', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger();

			connection.handlers.close?.('dropped');

			const emitted = (triggerFunctions.emitError as Mock).mock.calls[0][0] as NodeOperationError;
			expect(emitted).toBeInstanceOf(NodeOperationError);
			expect(emitted.message).toBe('IMAP connection closed unexpectedly');
			expect(emitted.description).toContain('retry reactivating the workflow');
		});

		it('reports once when the error is followed by a close', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger();

			connection.handlers.error?.(new Error('read ECONNRESET'));
			connection.handlers.close?.('error');
			await flush();

			expect(triggerFunctions.emitError).toHaveBeenCalledTimes(1);
		});
	});

	// Reconnecting itself belongs to @n8n/imap and is covered there; the node only asks for it.
	describe('reconnection', () => {
		it('asks the connection to watch the mailbox and hold it open', async () => {
			connectMock.mockResolvedValueOnce(createConnection());

			await startTrigger();

			expect(connectMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'imap.test.com' }), {
				mailbox: 'INBOX',
				interval: RECONNECT_INTERVAL_MS,
			});
		});

		it('leaves the interval unset when forced reconnect is off', async () => {
			connectMock.mockResolvedValueOnce(createConnection());

			await startTrigger({ forceReconnect: undefined });

			expect(connectMock).toHaveBeenCalledWith(expect.anything(), {
				mailbox: 'INBOX',
				interval: undefined,
			});
		});

		it('logs a restored connection without troubling the error workflow', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);
			await startTrigger();

			connection.handlers.reconnect?.();

			expect(triggerFunctions.emitError).not.toHaveBeenCalled();
		});
	});

	describe('catching up after a gap', () => {
		it('looks at the mailbox when it has processed mail before', async () => {
			staticData.lastMessageUid = 42;
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);

			await startTrigger();

			expect(connection.catchUp).toHaveBeenCalledTimes(1);
		});

		it('leaves the mailbox alone on a first activation', async () => {
			const connection = createConnection();
			connectMock.mockResolvedValueOnce(connection);

			await startTrigger();

			expect(connection.catchUp).not.toHaveBeenCalled();
		});
	});

	describe('credential test', () => {
		const runCredentialTest = async (connection: MockConnection) => {
			connectMock.mockResolvedValue(connection);

			return await new EmailReadImapV2(
				baseDescription,
			).methods.credentialTest.imapConnectionTest.call(mock<ICredentialTestFunctions>(), {
				data: credentials,
			} as unknown as ICredentialsDecrypted);
		};

		// An abandoned connection reports its own socket timeout minutes later, long
		// after the test has returned its verdict.
		it('ends the connection it opened', async () => {
			const connection = createConnection();

			expect(await runCredentialTest(connection)).toMatchObject({ status: 'OK' });
			expect(connection.end).toHaveBeenCalled();
		});

		it('ends the connection even when the command fails', async () => {
			const connection = createConnection();
			connection.list.mockRejectedValue(new Error('NO permission denied'));

			expect(await runCredentialTest(connection)).toMatchObject({ status: 'Error' });
			expect(connection.end).toHaveBeenCalled();
		});
	});

	describe('closeFunction', () => {
		const settle = async (connection: MockConnection) => {
			connectMock.mockResolvedValueOnce(connection);

			const { closeFunction } = await startTrigger({});
			let settled = false;
			void closeFunction!().then(
				() => (settled = true),
				() => (settled = true),
			);
			await vi.advanceTimersByTimeAsync(120_000);
			return settled;
		};

		it('settles so deactivation cannot wedge', async () => {
			expect(await settle(createConnection())).toBe(true);
		});

		it('ends the connection', async () => {
			const connection = createConnection();
			await settle(connection);
			expect(connection.end).toHaveBeenCalled();
		});

		it('settles even when ending the connection throws', async () => {
			const connection = createConnection();
			connection.end.mockImplementation(() => {
				throw new Error('connection already ended');
			});

			expect(await settle(connection)).toBe(true);
			expect(connection.end).toHaveBeenCalled();
		});
	});
});
