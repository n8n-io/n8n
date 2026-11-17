import type { IExecuteFunctions } from 'n8n-workflow';
import { jsonParse, requestUrl } from 'n8n-workflow';

import { buildDeleteCasesQuery, getConnector } from '../GenericFunctions';

describe('ElasticSecurity -> buildDeleteCasesQuery', () => {
	it('should keep a case id as a single array element', () => {
		const caseId = 'a","b';
		const { ids } = buildDeleteCasesQuery(caseId);

		expect(jsonParse(String(ids))).toEqual([caseId]);
	});
});

describe('ElasticSecurity -> getConnector', () => {
	it('should encode the connector ID in the request URL', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({});
		const executeFunctions = {
			getCredentials: vi.fn().mockResolvedValue({ baseUrl: 'https://kibana.local:5601' }),
			helpers: { requestWithAuthentication },
			getNode: vi.fn(),
		} as unknown as IExecuteFunctions;

		await getConnector.call(executeFunctions, 'conn-1/cases');

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'elasticSecurityApi',
			expect.objectContaining({
				uri: requestUrl`https://kibana.local:5601/api/actions/connector/conn-1%2Fcases`,
			}),
		);
	});

	it('should reject a connector ID with a dot segment', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({});
		const executeFunctions = {
			getCredentials: vi.fn().mockResolvedValue({ baseUrl: 'https://kibana.local:5601' }),
			helpers: { requestWithAuthentication },
			getNode: vi.fn(),
		} as unknown as IExecuteFunctions;

		await expect(getConnector.call(executeFunctions, 'conn-1/../cases')).rejects.toThrow(
			'Invalid identifier',
		);

		expect(requestWithAuthentication).not.toHaveBeenCalled();
	});
});
