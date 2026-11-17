import type { IRestApiContext } from '@n8n/rest-api-client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fetchInstancePolicy, saveInstancePolicy } from './type-availability-policies.api';

const { makeRestApiRequest } = vi.hoisted(() => ({ makeRestApiRequest: vi.fn() }));

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest,
}));

const context: IRestApiContext = { baseUrl: 'http://localhost', pushRef: 'test' };

describe('instance policy requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		['node', '/node-type-policies/instance'],
		['credential', '/credential-type-policies/instance'],
	] as const)('reads the %s policy from %s', async (kind, endpoint) => {
		await fetchInstancePolicy(context, kind);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', endpoint);
	});

	it.each([
		['node', '/node-type-policies/instance'],
		['credential', '/credential-type-policies/instance'],
	] as const)('saves the %s policy to %s with its version', async (kind, endpoint) => {
		await saveInstancePolicy(context, kind, { rules: [], defaultAction: 'deny', version: 3 });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PUT', endpoint, {
			rules: [],
			defaultAction: 'deny',
			version: 3,
		});
	});
});
