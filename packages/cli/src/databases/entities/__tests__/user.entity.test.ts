import { User } from '@db/entities/User';

describe('User Entity', () => {
	describe('JSON.stringify', () => {
		it('should not serialize sensitive data', () => {
			const user = Object.assign(new User(), {
				email: 'test@example.com',
				firstName: 'Don',
				lastName: 'Joe',
				password: '123456789',
				apiKey: '123',
			});
			expect(JSON.stringify(user)).toEqual(
				'{"email":"test@example.com","firstName":"Don","lastName":"Joe"}',
			);
		});
	});

	describe('createPersonalProjectName', () => {
		test.each([
			['Nathan', 'Nathaniel', 'nathan@nathaniel.n8n', 'Nathan Nathaniel <nathan@nathaniel.n8n>'],
			[undefined, 'Nathaniel', 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			['Nathan', undefined, 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			[undefined, undefined, 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			[undefined, undefined, undefined, 'Unnamed Project'],
			['Nathan', 'Nathaniel', undefined, 'Unnamed Project'],
		])(
			'given fistName: %s, lastName: %s and email: %s this gives the projectName: "%s"',
			async (firstName, lastName, email, projectName) => {
				const user = new User();
				Object.assign(user, { firstName, lastName, email });
				expect(user.createPersonalProjectName()).toBe(projectName);
			},
		);
	});
});
