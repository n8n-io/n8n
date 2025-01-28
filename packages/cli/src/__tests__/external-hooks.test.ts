import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import config from '@/config';
import type { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import type { SettingsRepository } from '@/databases/repositories/settings.repository';
import type { UserRepository } from '@/databases/repositories/user.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { ExternalHooks } from '@/external-hooks';

jest.mock('@/config', () => ({
	getEnv: jest.fn(),
}));

describe('ExternalHooks', () => {
	const errorReporter = mock<ErrorReporter>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const workflowRepository = mock<WorkflowRepository>();

	const workflowData = mock<IWorkflowBase>({ id: '123', name: 'Test Workflow' });
	const hookFn = jest.fn();

	let externalHooks: ExternalHooks;

	beforeEach(() => {
		jest.resetAllMocks();
		externalHooks = new ExternalHooks(
			errorReporter,
			userRepository,
			settingsRepository,
			credentialsRepository,
			workflowRepository,
		);
	});

	describe('init()', () => {
		it('should not load hooks if no external hook files are configured', async () => {
			jest.mocked(config.getEnv).mockReturnValue('');

			await externalHooks.init();

			expect(config.getEnv).toHaveBeenCalledWith('externalHookFiles');
		});

		it('should throw an error if hook file cannot be loaded', async () => {
			jest.mocked(config.getEnv).mockReturnValue('/path/to/non-existent-hook.js');

			jest.mock(
				'/path/to/non-existent-hook.js',
				() => {
					throw new Error('File not found');
				},
				{ virtual: true },
			);

			await expect(externalHooks.init()).rejects.toThrow(ApplicationError);
		});

		it('should successfully load hooks from valid hook file', async () => {
			const mockHookFile = {
				workflow: {
					create: [hookFn],
				},
			};

			jest.mocked(config.getEnv).mockReturnValue('/path/to/valid-hook.js');
			jest.mock('/path/to/valid-hook.js', () => mockHookFile, { virtual: true });

			await externalHooks.init();

			expect(externalHooks.registered['workflow.create']).toHaveLength(1);

			await externalHooks.run('workflow.create', [workflowData]);

			expect(hookFn).toHaveBeenCalledTimes(1);
			expect(hookFn).toHaveBeenCalledWith(workflowData);
		});
	});

	describe('run()', () => {
		it('should not throw if no hooks are registered', async () => {
			await externalHooks.run('n8n.stop');
		});

		it('should execute registered hooks', async () => {
			externalHooks.registered['workflow.create'] = [hookFn];

			await externalHooks.run('workflow.create', [workflowData]);

			expect(hookFn).toHaveBeenCalledTimes(1);
			expect(hookFn.mock.instances[0]).toHaveProperty('dbCollections');
		});

		it('should report error if hook execution fails', async () => {
			hookFn.mockRejectedValueOnce(new Error('Hook failed'));
			externalHooks.registered['workflow.create'] = [hookFn];

			await expect(externalHooks.run('workflow.create', [workflowData])).rejects.toThrow(
				ApplicationError,
			);

			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(ApplicationError), {
				level: 'fatal',
			});
		});
	});
});
