import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { UrlService } from '@/services/url.service';
import type { InviteEmailData, PasswordResetData } from '@/user-management/email/interfaces';
import { NodeMailer } from '@/user-management/email/node-mailer';
import { UserManagementMailer } from '@/user-management/email/user-management-mailer';
import { mockInstance } from '@test/mocking';

describe('UserManagementMailer', () => {
	const email = 'test@user.com';
	const nodeMailer = mockInstance(NodeMailer);
	const inviteEmailData = mock<InviteEmailData>({
		email,
		inviteAcceptUrl: 'https://accept.url',
	});
	const passwordResetData = mock<PasswordResetData>({
		email,
		passwordResetUrl: 'https://reset.url',
	});

	beforeEach(() => {
		jest.clearAllMocks();
		nodeMailer.sendMail.mockResolvedValue({ emailSent: true });
	});

	describe('when SMTP is not configured', () => {
		const config = mock<GlobalConfig>({
			userManagement: {
				emails: {
					mode: '',
				},
			},
		});
		const userManagementMailer = new UserManagementMailer(config, mock(), mock(), mock(), mock());

		it('should not setup email transport', async () => {
			expect(userManagementMailer.isEmailSetUp).toBe(false);
			expect(userManagementMailer.mailer).toBeUndefined();
		});

		it('should not send emails', async () => {
			const result = await userManagementMailer.invite(inviteEmailData);
			expect(result.emailSent).toBe(false);
			expect(nodeMailer.sendMail).not.toHaveBeenCalled();
		});
	});

	describe('when SMTP is configured', () => {
		const config = mock<GlobalConfig>({
			userManagement: {
				emails: {
					mode: 'smtp',
					smtp: {
						host: 'email.host',
					},
				},
			},
		});
		const urlService = mock<UrlService>();
		const userManagementMailer = new UserManagementMailer(
			config,
			mock(),
			mock(),
			urlService,
			mock(),
		);

		beforeEach(() => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.url');
		});

		it('should setup email transport', async () => {
			expect(userManagementMailer.isEmailSetUp).toBe(true);
			expect(userManagementMailer.mailer).toEqual(nodeMailer);
		});

		it('should send invitation emails', async () => {
			const result = await userManagementMailer.invite(inviteEmailData);
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining(`href="${inviteEmailData.inviteAcceptUrl}"`),
				emailRecipients: email,
				subject: 'You have been invited to n8n',
			});
		});

		it('should send password reset emails', async () => {
			const result = await userManagementMailer.passwordReset(passwordResetData);
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining(`href="${passwordResetData.passwordResetUrl}"`),
				emailRecipients: email,
				subject: 'n8n password reset',
			});
		});
	});
});
