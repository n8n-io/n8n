'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const node_mailer_1 = require('@/user-management/email/node-mailer');
const user_management_mailer_1 = require('@/user-management/email/user-management-mailer');
describe('UserManagementMailer', () => {
	const email = 'test@user.com';
	const nodeMailer = (0, backend_test_utils_1.mockInstance)(node_mailer_1.NodeMailer);
	const inviteEmailData = (0, jest_mock_extended_1.mock)({
		email,
		inviteAcceptUrl: 'https://accept.url',
	});
	const passwordResetData = (0, jest_mock_extended_1.mock)({
		email,
		passwordResetUrl: 'https://reset.url',
	});
	beforeEach(() => {
		jest.clearAllMocks();
		nodeMailer.sendMail.mockResolvedValue({ emailSent: true });
	});
	describe('when SMTP is not configured', () => {
		const config = (0, jest_mock_extended_1.mock)({
			userManagement: {
				emails: {
					mode: '',
				},
			},
		});
		const userManagementMailer = new user_management_mailer_1.UserManagementMailer(
			config,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
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
		const config = (0, jest_mock_extended_1.mock)({
			userManagement: {
				emails: {
					mode: 'smtp',
					smtp: {
						host: 'email.host',
					},
				},
			},
		});
		const urlService = (0, jest_mock_extended_1.mock)();
		const userRepository = (0, jest_mock_extended_1.mock)();
		const userManagementMailer = new user_management_mailer_1.UserManagementMailer(
			config,
			(0, jest_mock_extended_1.mock)(),
			userRepository,
			urlService,
			(0, jest_mock_extended_1.mock)(),
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
			const sharer = (0, jest_mock_extended_1.mock)({
				firstName: 'Sharer',
				email: 'sharer@user.com',
			});
			const newShareeIds = ['recipient1', 'recipient2'];
			const workflow = (0, jest_mock_extended_1.mock)({ id: 'workflow1', name: 'Test Workflow' });
			userRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			]);
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
			const sharer = (0, jest_mock_extended_1.mock)({
				firstName: 'Sharer',
				email: 'sharer@user.com',
			});
			const newShareeIds = ['recipient1', 'recipient2'];
			userRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			]);
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
			const sharer = (0, jest_mock_extended_1.mock)({
				firstName: 'Sharer',
				email: 'sharer@user.com',
			});
			const newSharees = [
				{ userId: 'recipient1', role: 'project:editor' },
				{ userId: 'recipient2', role: 'project:viewer' },
			];
			const project = { id: 'project1', name: 'Test Project' };
			userRepository.getEmailsByIds.mockResolvedValue([
				{
					id: 'recipient1',
					email: 'recipient1@user.com',
				},
				{
					id: 'recipient2',
					email: 'recipient2@user.com',
				},
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
					`You have been added as a ${sharee.role.replace('project:', '')} to the ${project.name} project`,
				);
			});
		});
	});
});
//# sourceMappingURL=user-management-mailer.test.js.map
