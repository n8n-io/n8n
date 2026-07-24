import type { IExecuteSingleFunctions } from 'n8n-workflow';

import { awsApiRequest } from '../../transport';

describe('AWS Cognito transport - awsApiRequest', () => {
	const httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
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
			logger: { warn },
			helpers: { httpRequestWithAuthentication },
		}) as unknown as IExecuteSingleFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		getCredentials.mockResolvedValue({ region: 'eu-central-1' });
	});

	it('should use the aws credential when authentication is iam', async () => {
		const context = createContext('iam');

		await awsApiRequest.call(context, 'POST', 'ListUsers', '{}');

		expect(getCredentials).toHaveBeenCalledWith('aws');
		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				method: 'POST',
				body: '{}',
				qs: { service: 'cognito-idp', _region: 'eu-central-1' },
			}),
		);
	});

	it('should use the awsAssumeRole credential when authentication is assumeRole', async () => {
		const context = createContext('assumeRole');

		await awsApiRequest.call(context, 'POST', 'ListUsers', '{}');

		expect(getCredentials).toHaveBeenCalledWith('awsAssumeRole');
		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'awsAssumeRole',
			expect.objectContaining({
				qs: { service: 'cognito-idp', _region: 'eu-central-1' },
			}),
		);
	});

	it('should fall back to the aws credential when the authentication parameter is missing', async () => {
		const context = createContext(undefined);

		await awsApiRequest.call(context, 'POST', 'ListUsers', '{}');

		expect(warn).toHaveBeenCalled();
		expect(getCredentials).toHaveBeenCalledWith('aws');
		expect(httpRequestWithAuthentication).toHaveBeenCalledWith('aws', expect.any(Object));
	});

	it('should resolve _region from the active credential', async () => {
		getCredentials.mockResolvedValue({ region: 'us-east-1' });
		const context = createContext('assumeRole');

		await awsApiRequest.call(context, 'POST', 'ListUsers', '{}');

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'awsAssumeRole',
			expect.objectContaining({ qs: { service: 'cognito-idp', _region: 'us-east-1' } }),
		);
	});
});
