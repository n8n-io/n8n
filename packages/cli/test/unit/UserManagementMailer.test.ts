import config from '@/config';
import { NodeMailer } from '@/UserManagement/email/NodeMailer';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';

describe('UserManagementMailer', () => {
	describe('expect NodeMailer.verifyConnection', () => {
		let mockInit: jest.SpyInstance<Promise<void>, []>;
		let mockVerifyConnection: jest.SpyInstance<Promise<void>, []>;

		beforeAll(() => {
			mockVerifyConnection = jest
				.spyOn(NodeMailer.prototype, 'verifyConnection')
				.mockImplementation(async () => {});
			mockInit = jest.spyOn(NodeMailer.prototype, 'init').mockImplementation(async () => {});
		});

		afterAll(() => {
			mockVerifyConnection.mockRestore();
			mockInit.mockRestore();
		});

		test('not be called when SMTP not set up', async () => {
			const userManagementMailer = new UserManagementMailer();
			// NodeMailer.verifyConnection gets called only explicitly
			await expect(async () => userManagementMailer.verifyConnection()).rejects.toThrow();

			expect(NodeMailer.prototype.verifyConnection).toHaveBeenCalledTimes(0);
		});

		test('to be called when SMTP set up', async () => {
			// host needs to be set, otherwise smtp is skipped
			config.set('userManagement.emails.smtp.host', 'host');
			config.set('userManagement.emails.mode', 'smtp');

			const userManagementMailer = new UserManagementMailer();
			// NodeMailer.verifyConnection gets called only explicitly
			expect(async () => userManagementMailer.verifyConnection()).not.toThrow();
		});
	});
});
