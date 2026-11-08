import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, Person } from '@n8n/db';
import { PersonRepository, ServiceAccount, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { ChangeEmailController } from '@/controllers/change-email.controller';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
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
	const personRepository = mockInstance(PersonRepository);
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
			person: { id: userId, email: oldEmail } as Person,
			newEmail,
		});
		emailChangeService.assertMayApplyEmailChange.mockResolvedValue(undefined);
		// The target email is free by default.
		userRepository.findOneBy.mockResolvedValue(null);
	});

	describe('confirmEmailChange', () => {
		const req = mock<AuthlessRequest>();
		const res = mock<Response>();
		const payload = { token: 'valid-token' };

		test('should not run the beforeUpdate hook when the change is stale', async () => {
			// The id pre-check finds an email that no longer matches the token's old email.
			personRepository.findById.mockResolvedValue({
				id: userId,
				email: 'changed@example.com',
			} as Person);

			await expect(controller.confirmEmailChange(req, res, payload)).rejects.toThrow(NotFoundError);

			expect(externalHooks.run).not.toHaveBeenCalled();
			expect(personRepository.changeEmail).not.toHaveBeenCalled();
		});

		test('should map an email-taken result to a client error', async () => {
			personRepository.findById.mockResolvedValue({ id: userId, email: oldEmail } as Person);
			personRepository.changeEmail.mockResolvedValue('email-taken');

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

	describe('requestEmailChange', () => {
		test('should reject a service account', async () => {
			const req = mock<AuthenticatedRequest>({
				user: Object.assign(new ServiceAccount(), { id: userId }),
			});

			await expect(
				controller.requestEmailChange(req, mock<Response>(), { email: newEmail } as never),
			).rejects.toThrow(ForbiddenError);

			expect(emailChangeService.assertMayRequestEmailChange).not.toHaveBeenCalled();
		});
	});
});
