import { databricksUserAgent } from '../../nodes/Databricks/constants';
import { DatabricksApi } from '../DatabricksApi.credentials';

describe('DatabricksApi Credential', () => {
	const databricksApi = new DatabricksApi();

	it('should send the partner User-Agent on the credential test, but not on every authenticated request', () => {
		expect(databricksApi.test.request.headers).toEqual({ 'User-Agent': databricksUserAgent() });
		// `authenticate` is bound to the credential, not to a host, so a User-Agent
		// here would also reach arbitrary URLs used with the HTTP Request node.
		expect(databricksApi.authenticate.properties).toEqual({
			headers: { Authorization: '=Bearer {{$credentials.token}}' },
		});
	});
});
