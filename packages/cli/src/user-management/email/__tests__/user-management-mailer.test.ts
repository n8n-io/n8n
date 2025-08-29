import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { ProjectRole, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';

import type { UrlService } from '@/services/url.service';
import type { InviteEmailData, PasswordResetData } from '@/user-management/email/interfaces';
import { NodeMailer } from '@/user-management/email/node-mailer';
import { UserManagementMailer } from '@/user-management/email/user-management-mailer';

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
		const userRepository = mock<UserRepository>();
		const userManagementMailer = new UserManagementMailer(
			config,
			mock(),
			userRepository,
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

		it('should send workflow share notifications', async () => {
			const sharer = mock<User>({ firstName: 'Sharer', email: 'sharer@user.com' });
			const newShareeIds = ['recipient1', 'recipient2'];
			const workflow = mock<IWorkflowBase>({ id: 'workflow1', name: 'Test Workflow' });
			userRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			] as User[]);
			const result = await userManagementMailer.notifyWorkflowShared({
				sharer,
				newShareeIds,
				workflow,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newShareeIds.forEach((id, index) => {
				expect(nodeMailer.sendMail).toHaveBeenNthCalledWith(index + 1, {
					body: expect.stringContaining(`href="https://n8n.url/workflow/${workflow.id}"`),
					emailRecipients: `${id}@user.com`,
					subject: 'Sharer has shared an n8n workflow with you',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain('Test Workflow');
				expect(callBody).toContain('A workflow has been shared with you');
			});
		});

		it('should send credentials share notifications', async () => {
			const sharer = mock<User>({ firstName: 'Sharer', email: 'sharer@user.com' });
			const newShareeIds = ['recipient1', 'recipient2'];
			userRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			] as User[]);
			const result = await userManagementMailer.notifyCredentialsShared({
				sharer,
				newShareeIds,
				credentialsName: 'Test Credentials',
			});
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newShareeIds.forEach((id, index) => {
				expect(nodeMailer.sendMail).toHaveBeenNthCalledWith(index + 1, {
					body: expect.stringContaining('href="https://n8n.url/home/credentials"'),
					emailRecipients: `${id}@user.com`,
					subject: 'Sharer has shared an n8n credential with you',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain('Test Credentials');
				expect(callBody).toContain('A credential has been shared with you');
			});
		});

		it('should send project share notifications', async () => {
			const sharer = mock<User>({ firstName: 'Sharer', email: 'sharer@user.com' });
			const newSharees = [
				{ userId: 'recipient1', role: 'project:editor' as ProjectRole },
				{ userId: 'recipient2', role: 'project:viewer' as ProjectRole },
			];
			const project = { id: 'project1', name: 'Test Project' };
			userRepository.getEmailsByIds.mockResolvedValue([
				{
					id: 'recipient1',
					email: 'recipient1@user.com',
				} as User,
				{
					id: 'recipient2',
					email: 'recipient2@user.com',
				} as User,
			]);
			const result = await userManagementMailer.notifyProjectShared({
				sharer,
				newSharees,
				project,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newSharees.forEach((sharee, index) => {
				expect(nodeMailer.sendMail).toHaveBeenCalledWith({
					body: expect.stringContaining(`href="https://n8n.url/projects/${project.id}"`),
					emailRecipients: `recipient${index + 1}@user.com`,
					subject: 'Sharer has invited you to a project',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain(
					`You have been added to the ${project.name} project as ${sharee.role.replace('project:', '')}`,
				);
			});
		});
	});
});
