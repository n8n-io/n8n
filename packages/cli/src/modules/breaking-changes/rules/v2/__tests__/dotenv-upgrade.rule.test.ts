import { access } from 'node:fs/promises';

import { DotenvUpgradeRule } from '../dotenv-upgrade.rule';

jest.mock('node:fs/promises');

describe('DotenvUpgradeRule', () => {
	let rule: DotenvUpgradeRule;
	const originalEnv = process.env;

	beforeEach(() => {
		rule = new DotenvUpgradeRule();
		process.env = { ...originalEnv };
		jest.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should not be affected when no .env files exist and DOTENV_CONFIG_PATH is not set', async () => {
			delete process.env.DOTENV_CONFIG_PATH;
			(access as jest.Mock).mockRejectedValue(new Error('File not found'));

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when DOTENV_CONFIG_PATH is set', async () => {
			process.env.DOTENV_CONFIG_PATH = '/path/to/.env';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('dotenv library upgrade detected');
		});

		it('should be affected when .env files exist', async () => {
			delete process.env.DOTENV_CONFIG_PATH;
			(access as jest.Mock).mockResolvedValue(undefined);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('dotenv library upgrade detected');
		});
	});
});
