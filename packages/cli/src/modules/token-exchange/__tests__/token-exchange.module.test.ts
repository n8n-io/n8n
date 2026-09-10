import { JtiCleanupTask } from '../services/jti-cleanup.task';
import { TrustedKeyRefreshTask } from '../services/trusted-key-refresh.task';
import { TokenExchangeModule } from '../token-exchange.module';

describe('TokenExchangeModule', () => {
	const module = new TokenExchangeModule();

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe('systemTasks()', () => {
		it('should register the maintenance tasks when the feature flag is enabled', async () => {
			vi.stubEnv('N8N_ENV_FEAT_TOKEN_EXCHANGE', 'true');

			await expect(module.systemTasks()).resolves.toEqual([TrustedKeyRefreshTask, JtiCleanupTask]);
		});

		it('should register no tasks when the feature flag is disabled', async () => {
			vi.stubEnv('N8N_ENV_FEAT_TOKEN_EXCHANGE', undefined);

			await expect(module.systemTasks()).resolves.toEqual([]);
		});
	});
});
