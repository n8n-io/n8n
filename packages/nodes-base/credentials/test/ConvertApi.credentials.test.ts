import get from 'lodash/get';
import type { IAuthenticateRuleResponseSuccessBody } from 'n8n-workflow';

import { ConvertApi } from '../ConvertApi.credentials';

describe('ConvertApi Credential', () => {
	const { request, rules } = new ConvertApi().test;

	// The credentials tester fails the test with the message of the first rule where `get(body, key) === value`
	const failureMessage = (body: unknown) =>
		(rules as IAuthenticateRuleResponseSuccessBody[]).find(
			(rule) => get(body, rule.properties.key) === rule.properties.value,
		)?.properties.message;

	it('should read the response body of error responses', () => {
		expect(request.ignoreHttpStatusErrors).toBe(true);
	});

	it('should fail when the API rejects the token', () => {
		expect(
			failureMessage({ Code: 4011, Message: 'Unauthorized. Invalid or missing API credentials.' }),
		).toBe('Invalid API token.');
	});

	it('should pass when the API accepts the token', () => {
		// The test request sends no file, so a valid token gets a parameter validation error
		expect(
			failureMessage({
				Code: 4000,
				Message: 'Parameter validation error.',
				InvalidParameters: { File: ['The File field is required.'] },
			}),
		).toBeUndefined();
	});
});
