import { EventEmitter } from 'events';
import { mock } from 'jest-mock-extended';
import type { INode, INodeTypeBaseDescription, ITriggerFunctions, IDataObject } from 'n8n-workflow';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV2 } from '../../v2/EmailReadImapV2.node';

let capturedOnMail: ((numEmails: number) => void) | undefined;
let concurrentCalls = 0;
let maxConcurrentCalls = 0;

const mockConnection = Object.assign(new EventEmitter(), {
	openBox: jest.fn().mockResolvedValue({}),
	closeBox: jest.fn().mockResolvedValue(undefined),
	end: jest.fn(),
	search: jest.fn().mockResolvedValue([]),
	getPartData: jest.fn(),
	addFlags: jest.fn().mockResolvedValue(undefined),
});

jest.mock('@n8n/imap', () => ({
	connect: jest.fn().mockImplementation(async (config: { onMail?: (n: number) => void }) => {
		capturedOnMail = config.onMail;
		return mockConnection;
	}),
}));

jest.mock('../../v2/utils', () => ({
	getNewEmails: jest.fn().mockImplementation(async function (this: ITriggerFunctions) {
		concurrentCalls++;
		if (concurrentCalls > maxConcurrentCalls) {
			maxConcurrentCalls = concurrentCalls;
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
		concurrentCalls--;
	}),
}));

describe('onMail concurrency protection', () => {
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
		capturedOnMail = undefined;
		concurrentCalls = 0;
		maxConcurrentCalls = 0;
		Object.keys(staticData).forEach((key) => delete staticData[key]);

		triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
		triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		triggerFunctions.getNodeParameter.mockImplementation(((param: string) => {
			const values: Record<string, unknown> = {
				mailbox: 'INBOX',
				postProcessAction: 'nothing',
				options: { trackLastMessageId: true },
			};
			return values[param];
		}) as typeof triggerFunctions.getNodeParameter);
		triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
		triggerFunctions.logger.debug = jest.fn();
		triggerFunctions.logger.error = jest.fn();
	});

	afterEach(() => jest.clearAllMocks());

	it('should serialize concurrent onMail calls', async () => {
		const node = new EmailReadImapV2(baseDescription);
		await node.trigger.call(triggerFunctions);

		expect(capturedOnMail).toBeDefined();

		capturedOnMail!(1);
		capturedOnMail!(1);
		capturedOnMail!(1);

		await new Promise((resolve) => setTimeout(resolve, 300));

		const { getNewEmails } = jest.requireMock('../../v2/utils') as {
			getNewEmails: jest.Mock;
		};
		expect(getNewEmails).toHaveBeenCalledTimes(3);
		expect(maxConcurrentCalls).toBe(1);
	});
});
