import { mock } from 'vitest-mock-extended';
import type { INode, INodeTypeBaseDescription, ITriggerFunctions } from 'n8n-workflow';

import { type ICredentialsDataImap } from '@credentials/Imap.credentials';

import { EmailReadImapV2 } from '../../v2/EmailReadImapV2.node';
import type * as _importType0 from '@n8n/imap';

vi.mock('@n8n/imap', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('@n8n/imap');

	return {
		...originalModule,
		connect: vi.fn().mockImplementation(() => ({
			then: vi.fn().mockImplementation(() => ({
				openBox: vi.fn().mockResolvedValue({}),
			})),
		})),
	};
});

describe('Test IMap V2', () => {
	const triggerFunctions = mock<ITriggerFunctions>({
		helpers: {
			createDeferredPromise: vi.fn().mockImplementation(() => {
				let resolve, reject;
				const promise = new Promise((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}),
		},
	});

	const credentials: ICredentialsDataImap = {
		host: 'imap.gmail.com',
		port: 993,
		user: 'user',
		password: 'password',
		secure: false,
		allowUnauthorizedCerts: false,
	};

	triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
	triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
	triggerFunctions.logger.debug = vi.fn();
	triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({
		name: 'Mark as Read',
		value: 'read',
	});

	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'EmailReadImapV2',
		name: 'emailReadImapV2',
		icon: 'node:remove-duplicates',
		group: ['transform'],
		description: 'Delete items with matching field values',
	};

	afterEach(() => vi.resetAllMocks());

	it('should run return a close function on success', async () => {
		const result = await new EmailReadImapV2(baseDescription).trigger.call(triggerFunctions);

		expect(result.closeFunction).toBeDefined();
	});
});
