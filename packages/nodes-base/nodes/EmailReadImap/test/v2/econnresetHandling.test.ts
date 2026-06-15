import { EventEmitter } from 'events';
import { mock } from 'jest-mock-extended';
import type { INode, INodeTypeBaseDescription, ITriggerFunctions, IDataObject } from 'n8n-workflow';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV2 } from '../../v2/EmailReadImapV2.node';

const mockConnection = Object.assign(new EventEmitter(), {
	openBox: jest.fn().mockResolvedValue({}),
	closeBox: jest.fn().mockResolvedValue(undefined),
	end: jest.fn(),
	search: jest.fn().mockResolvedValue([]),
	getPartData: jest.fn(),
	addFlags: jest.fn().mockResolvedValue(undefined),
});

jest.mock('@n8n/imap', () => ({
	connect: jest.fn().mockImplementation(async () => mockConnection),
}));

jest.mock('../../v2/utils', () => ({
	getNewEmails: jest.fn().mockResolvedValue(undefined),
}));

describe('ECONNRESET error handling', () => {
	const staticData: IDataObject = {};

	const triggerFunctions = mock<ITriggerFunctions>({
		helpers: {
			createDeferredPromise: jest.fn().mockImplementation(() => {
				let resolve: () => void;
				let reject: (e: Error) => void;
				const promise = new Promise<void>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve: resolve!, reject: reject! };
			}),
		},
	});

	const credentials: ICredentialsDataImap = {
		host: 'imap.test.com',
		port: 993,
		user: 'user',
		password: 'password',
		secure: false,
		allowUnauthorizedCerts: false,
	};

	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'EmailReadImapV2',
		name: 'emailReadImapV2',
		icon: 'file:removeDuplicates.svg',
		group: ['transform'],
		description: 'Test',
	};

	beforeEach(() => {
		mockConnection.removeAllListeners();
		Object.keys(staticData).forEach((key) => delete staticData[key]);

		triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
		triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		triggerFunctions.getNodeParameter.mockImplementation(((param: string) => {
			const values: Record<string, unknown> = {
				mailbox: 'INBOX',
				postProcessAction: 'nothing',
				options: {},
			};
			return values[param];
		}) as typeof triggerFunctions.getNodeParameter);
		triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
		triggerFunctions.logger.debug = jest.fn();
		triggerFunctions.logger.error = jest.fn();
		(triggerFunctions as { emitError: jest.Mock }).emitError = jest.fn();
	});

	afterEach(() => jest.clearAllMocks());

	it('should call emitError when ECONNRESET error is received', async () => {
		const node = new EmailReadImapV2(baseDescription);
		await node.trigger.call(triggerFunctions);

		// Simulate ECONNRESET from node-imap
		const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
		mockConnection.emit('error', error);

		expect(triggerFunctions.emitError).toHaveBeenCalledWith(error);
	});

	it('should call emitError on unexpected close (when not reconnecting or shutting down)', async () => {
		const node = new EmailReadImapV2(baseDescription);
		await node.trigger.call(triggerFunctions);

		// Simulate unexpected close without prior error
		mockConnection.emit('close', false);

		expect(triggerFunctions.emitError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Imap connection closed unexpectedly' }),
		);
	});

	it('should call emitError only once when ECONNRESET is followed by close', async () => {
		const node = new EmailReadImapV2(baseDescription);
		await node.trigger.call(triggerFunctions);

		// node-imap fires 'error' then 'close' on ECONNRESET
		const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
		mockConnection.emit('error', error);
		mockConnection.emit('close', true);

		// emitError should only be called once — the close handler should
		// not double-fire when the error handler already reported the failure
		expect(triggerFunctions.emitError).toHaveBeenCalledTimes(1);
	});

	it('should remove listeners from connection after close', async () => {
		const node = new EmailReadImapV2(baseDescription);
		await node.trigger.call(triggerFunctions);

		// Listeners were registered during establishConnection
		expect(mockConnection.listenerCount('close')).toBeGreaterThanOrEqual(1);
		expect(mockConnection.listenerCount('error')).toBeGreaterThanOrEqual(1);

		// Simulate ECONNRESET + close
		const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
		mockConnection.emit('error', error);
		mockConnection.emit('close', true);

		// Listeners should be cleaned up after the connection dies
		expect(mockConnection.listenerCount('close')).toBe(0);
		expect(mockConnection.listenerCount('error')).toBe(0);
	});
});
