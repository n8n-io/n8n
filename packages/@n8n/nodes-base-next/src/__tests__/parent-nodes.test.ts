import { parentNode } from '../index';

describe('parentNode', () => {
	it('gives GitHub with the base URL of its credentials and the input of its resources', () => {
		expect(parentNode('github')).toMatchObject({
			extendable: true,
			displayName: 'GitHub',
			credentials: [
				{ name: 'githubApi', baseUrl: '{server}', fields: { server: { type: 'string' } } },
				{ name: 'githubOAuth2Api', baseUrl: '{server}' },
			],
			resources: { issue: { required: ['owner', 'repository'] } },
		});
	});

	it('gives Slack with its error expression', () => {
		expect(parentNode('slack')).toMatchObject({
			extendable: true,
			baseUrl: 'https://slack.com/api',
			errorOf: expect.stringMatching(/^=\{\{ \$response\.body\.ok !== false/),
		});
	});

	it('refuses a node that checks its responses with code', () => {
		expect(parentNode('minimax')).toEqual({
			id: 'minimax',
			extendable: false,
			reason: 'minimax checks its responses with code',
		});
		expect(parentNode('nope')).toBeUndefined();
	});
});
