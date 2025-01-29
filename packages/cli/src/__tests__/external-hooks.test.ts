import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, Logger } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import type { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import type { SettingsRepository } from '@/databases/repositories/settings.repository';
import type { UserRepository } from '@/databases/repositories/user.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { ExternalHooks } from '@/external-hooks';

describe('ExternalHooks', () => {
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const globalConfig = mock<GlobalConfig>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const workflowRepository = mock<WorkflowRepository>();

	const workflowData = mock<IWorkflowBase>({ id: '123', name: 'Test Workflow' });
	const hookFn = jest.fn();

	let externalHooks: ExternalHooks;

	beforeEach(() => {
		jest.resetAllMocks();
		globalConfig.externalHooks.files = [];
		externalHooks = new ExternalHooks(
			logger,
			errorReporter,
			globalConfig,
			userRepository,
			settingsRepository,
			credentialsRepository,
			workflowRepository,
		);
	});

	describe('init()', () => {
		it('should not load hooks if no external hook files are configured', async () => {
			// @ts-expect-error private method
			const loadHooksSpy = jest.spyOn(externalHooks, 'loadHooks');
			await externalHooks.init();
			expect(loadHooksSpy).not.toHaveBeenCalled();
		});

		it('should throw an error if hook file cannot be loaded', async () => {
			globalConfig.externalHooks.files = ['/path/to/non-existent-hook.js'];

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

			globalConfig.externalHooks.files = ['/path/to/valid-hook.js'];
			jest.mock('/path/to/valid-hook.js', () => mockHookFile, { virtual: true });

			await externalHooks.init();

			// eslint-disable-next-line @typescript-eslint/dot-notation
			expect(externalHooks['registered']['workflow.create']).toHaveLength(1);

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
			// eslint-disable-next-line @typescript-eslint/dot-notation
			externalHooks['registered']['workflow.create'] = [hookFn];

			await externalHooks.run('workflow.create', [workflowData]);

			expect(hookFn).toHaveBeenCalledTimes(1);

			const hookInvocationContext = hookFn.mock.instances[0];
			expect(hookInvocationContext).toHaveProperty('dbCollections');
			expect(hookInvocationContext.dbCollections).toEqual({
				User: userRepository,
				Settings: settingsRepository,
				Credentials: credentialsRepository,
				Workflow: workflowRepository,
			});
		});

		it('should report error if hook execution fails', async () => {
			hookFn.mockRejectedValueOnce(new Error('Hook failed'));
			// eslint-disable-next-line @typescript-eslint/dot-notation
			externalHooks['registered']['workflow.create'] = [hookFn];

			await expect(externalHooks.run('workflow.create', [workflowData])).rejects.toThrow(
				ApplicationError,
			);

			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(ApplicationError), {
				level: 'fatal',
			});
			expect(logger.error).toHaveBeenCalledWith(
				'There was a problem running hook "workflow.create"',
			);
		});
	});
});
