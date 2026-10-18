import { ExternalSecretsRefreshTask } from '../external-secrets-refresh.task';
import { ExternalSecretsModule } from '../external-secrets.module';

describe('ExternalSecretsModule', () => {
	const module = new ExternalSecretsModule();

	describe('systemTasks()', () => {
		it('should register the refresh task', async () => {
			await expect(module.systemTasks()).resolves.toEqual([ExternalSecretsRefreshTask]);
		});
	});
});
