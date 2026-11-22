import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHookFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { jotformApiRequest } from '../../nodes/JotForm/GenericFunctions';
import { JotFormApi } from '../JotFormApi.credentials';

describe('JotFormApi credential test', () => {
	const context = mock<ICredentialTestFunctions>({
		helpers: mock<ICredentialTestFunctions['helpers']>({
			request: vi.fn().mockResolvedValue({ statusCode: 200 }),
		}),
	});

	const testCredentials = async (data: ICredentialsDecrypted['data']) =>
		await new JotFormApi().test.call(context, {
			id: 'jotform-credential',
			name: 'JotForm integration',
			type: 'jotFormApi',
			data,
		});

	const testedUri = () => {
		const [options] = vi.mocked(context.helpers.request).mock.calls[0] as [IRequestOptions];
		return String(options.uri);
	};

	// The URL the node itself would request, so the credential test can be held to it.
	const nodeUri = async (data: ICredentialDataDecryptedObject) => {
		const nodeContext = mockDeep<IHookFunctions>();
		nodeContext.getCredentials.mockResolvedValue(data);
		nodeContext.getNode.mockReturnValue({
			name: 'JotForm',
			type: 'n8n-nodes-base.jotFormTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as never);
		nodeContext.helpers.request.mockResolvedValue({});

		await jotformApiRequest.call(nodeContext, 'GET', requestPath`/user`);

		const [options] = nodeContext.helpers.request.mock.calls[0] as [IRequestOptions];
		return String(options.uri);
	};

	beforeEach(() => {
		vi.mocked(context.helpers.request).mockClear();
		vi.mocked(context.helpers.request).mockResolvedValue({ statusCode: 200 });
	});

	it.each<[ICredentialDataDecryptedObject, string]>([
		[{ apiKey: 'x', apiDomain: 'api.jotform.com' }, 'https://api.jotform.com/user'],
		[{ apiKey: 'x', apiDomain: 'eu-api.jotform.com' }, 'https://eu-api.jotform.com/user'],
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API' },
			'https://subdomain.jotform.com/API/user',
		],
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: 'https://subdomain.jotform.com/API' },
			'https://subdomain.jotform.com/API/user',
		],
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API/' },
			'https://subdomain.jotform.com/API/user',
		],
	])('should test the same URL that the node requests for %j', async (data, expectedUrl) => {
		expect(await testCredentials(data)).toEqual({
			status: 'OK',
			message: 'Connection successful!',
		});
		expect(testedUri()).toBe(expectedUrl);
		expect(await nodeUri(data)).toBe(expectedUrl);
	});

	it('should report an authentication failure', async () => {
		vi.mocked(context.helpers.request).mockResolvedValueOnce({ statusCode: 401 });

		expect(await testCredentials({ apiKey: 'x', apiDomain: 'api.jotform.com' })).toEqual({
			status: 'Error',
			message: 'Authentication failed. Check your API key.',
		});
	});

	it.each<[ICredentialDataDecryptedObject, string]>([
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: '' },
			'JotForm Enterprise requires a custom API domain.',
		],
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API?x=1' },
			'Do not include a query string or fragment.',
		],
		[
			{ apiKey: 'x', apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API#x' },
			'Do not include a query string or fragment.',
		],
		[
			{
				apiKey: 'x',
				apiDomain: 'custom',
				customApiDomain: 'subdomain.jotform.com@attacker.example',
			},
			'Do not include credentials in the domain.',
		],
	])(
		'should reject an invalid custom domain before making a request for %j',
		async (data, expectedMessage) => {
			const result = await testCredentials(data);

			expect(result.status).toBe('Error');
			expect(result.message).toContain(expectedMessage);
			expect(context.helpers.request).not.toHaveBeenCalled();
		},
	);
});
