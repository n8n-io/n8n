import type { IRestApiContext } from '@n8n/rest-api-client';

import {
	createRule,
	deleteRule,
	fetchProjectRules,
	fetchProjectPolicy,
	fetchRuleImpact,
	fetchRules,
	saveProjectPolicy,
	updateRule,
} from './runtime-credentials.api';

const { makeRestApiRequest } = vi.hoisted(() => ({ makeRestApiRequest: vi.fn() }));

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest,
}));

const context: IRestApiContext = { baseUrl: 'http://localhost', pushRef: 'test' };

describe('runtime credential rule requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the rules list', async () => {
		makeRestApiRequest.mockResolvedValue({ rules: [{ alias: 'a' }] });

		await expect(fetchRules(context)).resolves.toEqual([{ alias: 'a' }]);
		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/runtime-credential-rules');
	});

	it('posts the rule values to the impact endpoint', async () => {
		const impact = { workflows: [], truncated: false };
		makeRestApiRequest.mockResolvedValue(impact);

		await expect(fetchRuleImpact(context, { nodeType: 'n', path: 'p' })).resolves.toBe(impact);
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/runtime-credential-rules/impact',
			{ nodeType: 'n', path: 'p' },
		);
	});

	it('creates a rule', async () => {
		const rule = { alias: 'a', nodeType: 'n', path: 'p', credentialType: 'c' };

		await createRule(context, rule);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/runtime-credential-rules',
			rule,
		);
	});

	it('updates a rule and encodes the alias', async () => {
		await updateRule(context, 'my alias', { path: 'x' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PATCH',
			'/runtime-credential-rules/my%20alias',
			{ path: 'x' },
		);
	});

	it('passes allowed endpoints on create and null to clear on update', async () => {
		const rule = {
			alias: 'a',
			nodeType: 'n',
			path: 'p',
			credentialType: 'c',
			allowedDomains: 'a.com',
		};
		await createRule(context, rule);
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(
			context,
			'POST',
			'/runtime-credential-rules',
			rule,
		);

		await updateRule(context, 'a', { allowedDomains: null });
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(
			context,
			'PATCH',
			'/runtime-credential-rules/a',
			{ allowedDomains: null },
		);
	});

	it('deletes a rule', async () => {
		await deleteRule(context, 'a');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'DELETE',
			'/runtime-credential-rules/a',
		);
	});
});

describe('request-fed credential type policy requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the project rules from the project scoped endpoint', async () => {
		makeRestApiRequest.mockResolvedValue({ rules: [{ alias: 'a' }] });

		await expect(fetchProjectRules(context, 'p/1')).resolves.toEqual([{ alias: 'a' }]);
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/p%2F1/runtime-credential-rules',
		);
	});

	it('reads the project policy', async () => {
		await fetchProjectPolicy(context, 'p1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/p1/request-fed-credential-type-policies/project',
		);
	});

	it('saves the project policy with its version', async () => {
		await saveProjectPolicy(context, 'p1', { rules: [], defaultAction: 'allow', version: 3 });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PUT',
			'/projects/p1/request-fed-credential-type-policies/project',
			{ rules: [], defaultAction: 'allow', version: 3 },
		);
	});
});
