import get from 'lodash/get';
import type { IAuthenticateRuleResponseSuccessBody } from 'n8n-workflow';

import { N8nApi } from '../N8nApi.credentials';

describe('N8nApi Credential', () => {
	const [rule] = new N8nApi().test.rules as IAuthenticateRuleResponseSuccessBody[];

	// The credentials tester fails the test when `get(body, key) === value`
	const fails = (body: unknown) => get(body, rule.properties.key) === rule.properties.value;

	it('should fail when the Base URL returns the editor UI page', () => {
		expect(fails('<!DOCTYPE html><html></html>')).toBe(true);
	});

	it('should pass when the Base URL returns the credential schema', () => {
		expect(fails({ additionalProperties: false, type: 'object', properties: {} })).toBe(false);
	});
});
