import { describe, expect, it } from 'vitest';

import { isV1NodeStepConfig } from '../guards';

const config = (credentials: unknown) => ({
	nodeType: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	parameters: {},
	continueOnFail: false,
	credentials,
});

describe('isV1NodeStepConfig', () => {
	it('accepts a config without credentials', () => {
		expect(isV1NodeStepConfig(config(undefined))).toBe(true);
	});

	it('accepts credential entries with a string or null id and a name', () => {
		expect(
			isV1NodeStepConfig(
				config({
					httpHeaderAuth: { id: 'cred-1', name: 'Header Auth account' },
					httpBasicAuth: { id: null, name: 'Basic Auth account' },
				}),
			),
		).toBe(true);
	});

	it('accepts a credential entry with a boolean __aiGatewayManaged flag', () => {
		expect(
			isV1NodeStepConfig(
				config({
					openAiApi: { id: null, name: 'n8n Connect', __aiGatewayManaged: true },
				}),
			),
		).toBe(true);
	});

	it.each([
		['a non-object map', 'httpHeaderAuth'],
		['a non-object entry', { httpHeaderAuth: 'cred-1' }],
		['an entry without a name', { httpHeaderAuth: { id: 'cred-1' } }],
		['an entry with a numeric id', { httpHeaderAuth: { id: 1, name: 'Header Auth account' } }],
		[
			'an entry with a non-boolean __aiGatewayManaged flag',
			{ openAiApi: { id: null, name: 'n8n Connect', __aiGatewayManaged: 'true' } },
		],
	])('rejects %s', (_label, credentials) => {
		expect(isV1NodeStepConfig(config(credentials))).toBe(false);
	});
});
