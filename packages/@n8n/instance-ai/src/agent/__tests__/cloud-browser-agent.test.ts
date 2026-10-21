import { buildTaskMessage } from '../cloud-browser-agent';

describe('buildTaskMessage', () => {
	it('gives the goal and the start URL', () => {
		expect(
			buildTaskMessage({ goal: 'Find the price', startUrl: 'https://example.com/pricing' }),
		).toBe('Goal: Find the price\nStart URL: https://example.com/pricing');
	});

	it('lists each credential to create with its fields', () => {
		const message = buildTaskMessage({
			goal: 'Save the test login',
			credentialsToCreate: [
				{
					type: 'httpBasicAuth',
					name: 'The Internet test login',
					fields: [
						{ name: 'user', displayName: 'User', type: 'string', required: true },
						{ name: 'password', displayName: 'Password', type: 'string', required: false },
					],
				},
			],
		});

		expect(message).toBe(
			[
				'Goal: Save the test login',
				'',
				'Credentials to create:',
				'- Name: "The Internet test login", type: httpBasicAuth',
				'  Fields: user (User, required), password (Password)',
			].join('\n'),
		);
	});
});
