import type { IDataObject, INode, INodeTypeBaseDescription, ITriggerFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV1 } from './EmailReadImapV1.node';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('@n8n/imap', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/imap')>()),
	ImapSimple: { connect: connectMock },
}));

const FORCE_RECONNECT_MINUTES = 5;

const createConnection = () => {
	const handlers: {
		close?: (reason: 'ended' | 'error' | 'dropped') => void;
		reconnect?: () => void;
	} = {};

	return {
		handlers,
		endedByCaller: false,
		onArrival() {
			return this;
		},
		onError() {
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
		end: vi.fn(),
	};
};

// Reconnecting itself belongs to @n8n/imap and is covered there; the node only asks for it.
describe('EmailReadImapV1 reconnection', () => {
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
		secure: true,
		allowUnauthorizedCerts: false,
	};

	const triggerFunctions = mock<ITriggerFunctions>({
		helpers: {
			createDeferredPromise: vi.fn().mockImplementation(() => ({
				promise: Promise.resolve(),
				resolve: vi.fn(),
				reject: vi.fn(),
			})),
		},
	});

	const startTrigger = async (
		options: IDataObject = { forceReconnect: FORCE_RECONNECT_MINUTES },
	) => {
		triggerFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'mailbox') return 'INBOX';
			if (name === 'postProcessAction') return 'nothing';
			if (name === 'format') return 'simple';
			if (name === 'options') return options;
			return undefined;
		});

		return await new EmailReadImapV1(baseDescription).trigger.call(triggerFunctions);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		triggerFunctions.logger.debug = vi.fn();
		triggerFunctions.logger.error = vi.fn();
		triggerFunctions.getCredentials.mockResolvedValue(credentials as unknown as IDataObject);
		triggerFunctions.getNode.mockReturnValue(mock<INode>());
		triggerFunctions.getWorkflowStaticData.mockReturnValue({});
	});

	it('asks the connection to watch the mailbox and hold it open', async () => {
		connectMock.mockResolvedValueOnce(createConnection());

		await startTrigger();

		expect(connectMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'imap.test.com' }), {
			mailbox: 'INBOX',
			interval: FORCE_RECONNECT_MINUTES * 60_000,
		});
	});

	it('leaves the interval unset when forced reconnect is off', async () => {
		connectMock.mockResolvedValueOnce(createConnection());

		await startTrigger({});

		expect(connectMock).toHaveBeenCalledWith(expect.anything(), {
			mailbox: 'INBOX',
			interval: undefined,
		});
	});

	it('reports a close it did not ask for', async () => {
		const connection = createConnection();
		connectMock.mockResolvedValueOnce(connection);
		await startTrigger();

		connection.handlers.close?.('dropped');

		expect(triggerFunctions.emitError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'IMAP connection closed unexpectedly' }),
		);
	});

	it('stays quiet about a close that followed a reported error', async () => {
		const connection = createConnection();
		connectMock.mockResolvedValueOnce(connection);
		await startTrigger();

		connection.handlers.close?.('error');

		expect(triggerFunctions.emitError).not.toHaveBeenCalled();
	});

	it('ends the connection when the trigger closes', async () => {
		const connection = createConnection();
		connectMock.mockResolvedValueOnce(connection);

		const response = await startTrigger();
		await response?.closeFunction?.();

		expect(connection.end).toHaveBeenCalled();
	});
});
