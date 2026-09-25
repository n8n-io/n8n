import type { IExecuteSingleFunctions } from 'n8n-workflow';

import { awsApiRequest } from '../../transport';

describe('AWS IAM transport - awsApiRequest', () => {
	const requestWithAuthentication = vi.fn().mockResolvedValue({});
	const getCredentials = vi.fn().mockResolvedValue({ region: 'eu-central-1' });
	const warn = vi.fn();

	const createContext = (authentication?: string) =>
		({
			getNodeParameter: vi.fn((name: string) => {
				if (name === 'authentication') {
					if (authentication === undefined) {
						throw new Error('Could not get parameter');
					}
					return authentication;
				}
				return undefined;
			}),
			getCredentials,
			getNode: vi.fn(() => ({ name: 'AWS IAM' })),
			logger: { warn },
			helpers: { requestWithAuthentication },
		}) as unknown as IExecuteSingleFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should use the aws credential when authentication is iam', async () => {
		const context = createContext('iam');

		await awsApiRequest.call(context, { url: '', method: 'POST' });

		expect(getCredentials).toHaveBeenCalledWith('aws');
		expect(requestWithAuthentication).toHaveBeenCalledWith('aws', expect.any(Object));
	});

	it('should use the awsAssumeRole credential when authentication is assumeRole', async () => {
		const context = createContext('assumeRole');

		await awsApiRequest.call(context, { url: '', method: 'POST' });

		expect(getCredentials).toHaveBeenCalledWith('awsAssumeRole');
		expect(requestWithAuthentication).toHaveBeenCalledWith('awsAssumeRole', expect.any(Object));
	});

	it('should fall back to the aws credential when the authentication parameter is missing', async () => {
		const context = createContext(undefined);

		await awsApiRequest.call(context, { url: '', method: 'POST' });

		expect(warn).toHaveBeenCalled();
		expect(getCredentials).toHaveBeenCalledWith('aws');
		expect(requestWithAuthentication).toHaveBeenCalledWith('aws', expect.any(Object));
	});
});
