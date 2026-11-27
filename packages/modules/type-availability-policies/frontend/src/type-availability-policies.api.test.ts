import type { IRestApiContext } from '@n8n/rest-api-client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
	createProjectPolicy,
	fetchCredentialTypeSummaries,
	fetchCredentialTypeUsage,
	fetchInstanceAccess,
	fetchInstancePolicy,
	fetchNodeTypeSummaries,
	fetchNodeTypeUsage,
	fetchProjectPolicies,
	saveInstancePolicy,
} from './type-availability-policies.api';

const { makeRestApiRequest, get } = vi.hoisted(() => ({
	makeRestApiRequest: vi.fn(),
	get: vi.fn(),
}));

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest,
	get,
}));

const context: IRestApiContext = { baseUrl: 'http://localhost', pushRef: 'test' };

// The summaries are kept for each base URL, so each test reads from its own.
let instanceCount = 0;
const newBaseUrl = () => `/instance-${++instanceCount}/`;

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

describe('project policy requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the team projects with their policy state', async () => {
		await fetchProjectPolicies(context);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/project-policies');
	});

	it('adds a policy to one project', async () => {
		await createProjectPolicy(context, 'project-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/project-policies', {
			projectId: 'project-1',
		});
	});
});

describe('instance access requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the credential access list from the access route', async () => {
		await fetchInstanceAccess(context, 'credential');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/credential-type-policies/instance/access',
		);
	});

	it('reads the credential type usage from the usage route', async () => {
		await fetchCredentialTypeUsage(context);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/credential-type-policies/usage',
		);
	});

	it('reads the node type usage from the usage route', async () => {
		await fetchNodeTypeUsage(context);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/node-type-policies/usage');
	});

	it('reads the name, icon and parents of each credential type and skips malformed entries', async () => {
		get.mockResolvedValue([
			{
				name: 'bitlyApi',
				displayName: 'Bitly API',
				iconUrl: { light: 'icons/light.svg', dark: 'icons/dark.svg' },
				iconColor: 'blue',
				extends: ['oAuth2Api'],
				properties: [],
			},
			{ name: 'broken' },
			'notARecord',
		]);

		const baseUrl = newBaseUrl();
		const types = await fetchCredentialTypeSummaries(baseUrl);

		expect(get).toHaveBeenCalledWith(baseUrl, 'types/credentials.json');
		expect([...types]).toEqual([
			[
				'bitlyApi',
				{
					displayName: 'Bitly API',
					icon: undefined,
					iconUrl: { light: 'icons/light.svg', dark: 'icons/dark.svg' },
					iconColor: 'blue',
					extends: ['oAuth2Api'],
				},
			],
		]);
	});

	it('reads the file again while the server has not written it yet', async () => {
		vi.useFakeTimers();
		get
			.mockResolvedValueOnce({})
			.mockResolvedValue([{ name: 'bitlyApi', displayName: 'Bitly API' }]);

		const request = fetchCredentialTypeSummaries(newBaseUrl());
		await vi.runAllTimersAsync();

		expect([...(await request).keys()]).toEqual(['bitlyApi']);
		expect(get).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it('returns no credential types when the file never becomes a list', async () => {
		vi.useFakeTimers();
		get.mockResolvedValue({});

		const request = fetchCredentialTypeSummaries(newBaseUrl());
		await vi.runAllTimersAsync();

		expect((await request).size).toBe(0);
		expect(get).toHaveBeenCalledTimes(5);
		vi.useRealTimers();
	});

	it('reads the file once for each base URL', async () => {
		get.mockResolvedValue([{ name: 'bitlyApi', displayName: 'Bitly API' }]);
		const baseUrl = newBaseUrl();

		await fetchCredentialTypeSummaries(baseUrl);
		const types = await fetchCredentialTypeSummaries(baseUrl);

		expect([...types.keys()]).toEqual(['bitlyApi']);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it('reads the file again after a failed read', async () => {
		get
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue([{ name: 'bitlyApi', displayName: 'Bitly API' }]);
		const baseUrl = newBaseUrl();

		await expect(fetchCredentialTypeSummaries(baseUrl)).rejects.toThrow('offline');
		const types = await fetchCredentialTypeSummaries(baseUrl);

		expect([...types.keys()]).toEqual(['bitlyApi']);
	});
});

describe('node type summaries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the latest version of each node type and skips malformed entries', async () => {
		get.mockResolvedValue([
			{ name: 'n8n-nodes-base.set', displayName: 'Set', version: [1, 2] },
			{
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields (Set)',
				version: [3, 3.4],
				iconUrl: 'icons/set.svg',
			},
			{ name: 'n8n-nodes-base.set', displayName: 'Set (very old)', version: 0.5 },
			{
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				version: 2,
				icon: 'fa:slack',
				iconColor: 'purple',
			},
			{ name: 'n8n-nodes-base.internal', displayName: 'Internal', version: 1, hidden: true },
			{ name: 'broken' },
			'notARecord',
		]);

		const baseUrl = newBaseUrl();
		const types = await fetchNodeTypeSummaries(baseUrl);

		expect(get).toHaveBeenCalledWith(baseUrl, 'types/nodes.json');
		expect(Object.fromEntries(types)).toEqual({
			'n8n-nodes-base.set': {
				displayName: 'Edit Fields (Set)',
				hidden: false,
				icon: undefined,
				iconUrl: 'icons/set.svg',
				iconColor: undefined,
			},
			'n8n-nodes-base.slack': {
				displayName: 'Slack',
				hidden: false,
				icon: 'fa:slack',
				iconUrl: undefined,
				iconColor: 'purple',
			},
			'n8n-nodes-base.internal': {
				displayName: 'Internal',
				hidden: true,
				icon: undefined,
				iconUrl: undefined,
				iconColor: undefined,
			},
		});
	});

	it('reads the file once for each base URL, apart from the credential types', async () => {
		get.mockResolvedValue([{ name: 'n8n-nodes-base.slack', displayName: 'Slack', version: 1 }]);
		const baseUrl = newBaseUrl();

		await fetchNodeTypeSummaries(baseUrl);
		await fetchNodeTypeSummaries(baseUrl);
		await fetchCredentialTypeSummaries(baseUrl);

		expect(get).toHaveBeenCalledTimes(2);
		expect(get).toHaveBeenNthCalledWith(1, baseUrl, 'types/nodes.json');
		expect(get).toHaveBeenNthCalledWith(2, baseUrl, 'types/credentials.json');
	});
});
