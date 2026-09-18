import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { ChangeEmailController } from '@/controllers/change-email.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import type { AuthlessRequest } from '@/requests';
import { EmailChangeService } from '@/services/email-change.service';
import { UserService } from '@/services/user.service';
import { UserManagementMailer } from '@/user-management/email';

describe('ChangeEmailController', () => {
	mockInstance(Logger);
	const externalHooks = mockInstance(ExternalHooks);
	const authService = mockInstance(AuthService);
	mockInstance(UserService);
	const userRepository = mockInstance(UserRepository);
	mockInstance(UserManagementMailer);
	const emailChangeService = mockInstance(EmailChangeService);
	mockInstance(EventService);
	const controller = Container.get(ChangeEmailController);

	const oldEmail = 'old@example.com';
	const newEmail = 'new@example.com';
	const userId = 'user-1';

	beforeEach(() => {
		vi.resetAllMocks();
		authService.resolveEmailChangeToken.mockResolvedValue({
			user: { id: userId, email: oldEmail } as User,
			newEmail,
		});
		emailChangeService.assertMayApplyEmailChange.mockResolvedValue(undefined);
		// The target email is free by default; each test overrides the id lookup.
		userRepository.findOneBy.mockResolvedValue(null);
	});

	describe('confirmEmailChange', () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>();
		const payload = { token: 'valid-token' };

		test('should not run the beforeUpdate hook when the change is stale', async () => {
			// First lookup is the availability check (free), second is the id pre-check
			// whose email no longer matches the token's old email.
			userRepository.findOneBy
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ id: userId, email: 'changed@example.com' } as User);

			await expect(controller.confirmEmailChange(req, res, payload)).rejects.toThrow(NotFoundError);

			expect(externalHooks.run).not.toHaveBeenCalled();
			expect(userRepository.changeEmail).not.toHaveBeenCalled();
		});

		test('should map an email-taken result to a client error', async () => {
			userRepository.findOneBy
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ id: userId, email: oldEmail } as User);
			userRepository.changeEmail.mockResolvedValue('email-taken');

			await expect(controller.confirmEmailChange(req, res, payload)).rejects.toThrow(
				BadRequestError,
			);

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.beforeUpdate', [
				userId,
				oldEmail,
				{ email: newEmail },
			]);
		});
	});
});
