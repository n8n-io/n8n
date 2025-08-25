import { UnexpectedError } from 'n8n-workflow';

import { Redactable, RedactableError } from '../redactable';

describe('Redactable Decorator', () => {
	class TestClass {
		@Redactable()
		methodWithUser(arg: {
			user: { id: string; email?: string; firstName?: string; lastName?: string; role: string };
		}) {
			return arg;
		}

		@Redactable('inviter')
		methodWithInviter(arg: {
			inviter: { id: string; email?: string; firstName?: string; lastName?: string; role: string };
		}) {
			return arg;
		}

		@Redactable('invitee')
		methodWithInvitee(arg: {
			invitee: { id: string; email?: string; firstName?: string; lastName?: string; role: string };
		}) {
			return arg;
		}

		@Redactable()
		methodWithMultipleArgs(
			firstArg: { something: string },
			secondArg: {
				user: { id: string; email?: string; firstName?: string; lastName?: string; role: string };
			},
		) {
			return { firstArg, secondArg };
		}

		@Redactable()
		methodWithoutUser(arg: { something: string }) {
			return arg;
		}
	}

	let instance: TestClass;

	beforeEach(() => {
		instance = new TestClass();
	});

	describe('RedactableError', () => {
		it('should extend UnexpectedError', () => {
			const error = new RedactableError('user', 'testArg');
			expect(error).toBeInstanceOf(UnexpectedError);
		});

		it('should have correct error message', () => {
			const error = new RedactableError('user', 'testArg');
			expect(error.message).toBe(
				'Failed to find "user" property in argument "testArg". Please set the decorator `@Redactable()` only on `LogStreamingEventRelay` methods where the argument contains a "user" property.',
			);
		});
	});

	describe('@Redactable() decorator', () => {
		it('should transform user properties in a method with a user argument', () => {
			const input = {
				user: {
					id: '123',
					email: 'test@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: 'admin',
				},
			};

			const result = instance.methodWithUser(input);

			expect(result.user).toEqual({
				userId: '123',
				_email: 'test@example.com',
				_firstName: 'John',
				_lastName: 'Doe',
				globalRole: 'admin',
			});
		});

		it('should transform inviter properties when fieldName is set to "inviter"', () => {
			const input = {
				inviter: {
					id: '123',
					email: 'test@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: 'admin',
				},
			};

			const result = instance.methodWithInviter(input);

			expect(result.inviter).toEqual({
				userId: '123',
				_email: 'test@example.com',
				_firstName: 'John',
				_lastName: 'Doe',
				globalRole: 'admin',
			});
		});

		it('should transform invitee properties when fieldName is set to "invitee"', () => {
			const input = {
				invitee: {
					id: '123',
					email: 'test@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: 'admin',
				},
			};

			const result = instance.methodWithInvitee(input);

			expect(result.invitee).toEqual({
				userId: '123',
				_email: 'test@example.com',
				_firstName: 'John',
				_lastName: 'Doe',
				globalRole: 'admin',
			});
		});

		it('should handle user object with missing optional properties', () => {
			const input = {
				user: {
					id: '123',
					role: 'admin',
				},
			};

			const result = instance.methodWithUser(input);

			expect(result.user).toEqual({
				userId: '123',
				_email: undefined,
				_firstName: undefined,
				_lastName: undefined,
				globalRole: 'admin',
			});
		});

		it('should find user property in any argument', () => {
			const firstArg = { something: 'test' };
			const secondArg = {
				user: {
					id: '123',
					email: 'test@example.com',
					role: 'admin',
				},
			};

			const result = instance.methodWithMultipleArgs(firstArg, secondArg);

			expect(result.secondArg.user).toEqual({
				userId: '123',
				_email: 'test@example.com',
				_firstName: undefined,
				_lastName: undefined,
				globalRole: 'admin',
			});
			expect(result.firstArg).toEqual(firstArg);
		});

		it('should throw RedactableError when no user property is found', () => {
			expect(() => {
				instance.methodWithoutUser({ something: 'test' });
			}).toThrow(RedactableError);
		});

		it('should correctly apply the original method', () => {
			const spy = jest.spyOn(instance, 'methodWithUser');

			const input = {
				user: {
					id: '123',
					email: 'test@example.com',
					role: 'admin',
				},
			};

			instance.methodWithUser(input);

			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});
	});
});
