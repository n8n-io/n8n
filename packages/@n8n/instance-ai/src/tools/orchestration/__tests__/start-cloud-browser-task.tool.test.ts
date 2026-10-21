import { cloudBrowserTaskInputSchema } from '../start-cloud-browser-task.tool';

describe('cloudBrowserTaskInputSchema', () => {
	const task = { title: 'Save test login', goal: 'Save the login shown on the page' };

	it('accepts credentials to create, each with a type and a name', () => {
		const parsed = cloudBrowserTaskInputSchema.parse({
			...task,
			credentialsToCreate: [{ type: 'httpBasicAuth', name: 'The Internet test login' }],
		});

		expect(parsed.credentialsToCreate).toEqual([
			{ type: 'httpBasicAuth', name: 'The Internet test login' },
		]);
	});

	it('rejects a credential without a name', () => {
		expect(
			cloudBrowserTaskInputSchema.safeParse({
				...task,
				credentialsToCreate: [{ type: 'httpBasicAuth' }],
			}).success,
		).toBe(false);
	});
});
