import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	WorkflowRepository,
	CredentialsRepository,
	SettingsRepository,
	UserRepository,
} from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExternalHooks } from '@/external-hooks';

// `ExternalHooks` loads hook files via `require(<path>)`. Vitest cannot mock a
// path that doesn't resolve to a real module, so write a real fixture that
// delegates to a per-test global, letting the test assert on its own spy.
const { validHookPath } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { mkdtempSync, writeFileSync } = require('fs');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { tmpdir } = require('os');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { join } = require('path');
	const dir = mkdtempSync(join(tmpdir(), 'ext-hooks-'));
	const p = join(dir, 'valid-hook.js');
	writeFileSync(
		p,
		'module.exports = { workflow: { create: [(...args) => globalThis.__extHookFn(...args)] } };',
	);
	return { validHookPath: p as string };
});

describe('ExternalHooks', () => {
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const globalConfig = mock<GlobalConfig>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const workflowRepository = mock<WorkflowRepository>();

	const workflowData = mock<IWorkflowBase>({ id: '123', name: 'Test Workflow' });
	const hookFn = vi.fn();

	let externalHooks: ExternalHooks;

	beforeEach(() => {
		vi.resetAllMocks();
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
			const loadHooksSpy = vi.spyOn(externalHooks, 'loadHooks');
			await externalHooks.init();
			expect(loadHooksSpy).not.toHaveBeenCalled();
		});

		it('should throw an error if hook file cannot be loaded', async () => {
			globalConfig.externalHooks.files = ['/path/to/non-existent-hook.js'];

			vi.mock('/path/to/non-existent-hook.js', () => {
				throw new Error('File not found');
			});

			await expect(externalHooks.init()).rejects.toThrow(UnexpectedError);
		});

		it('should successfully load hooks from valid hook file', async () => {
			(globalThis as unknown as { __extHookFn: typeof hookFn }).__extHookFn = hookFn;

			globalConfig.externalHooks.files = [validHookPath];

			await externalHooks.init();

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
			externalHooks['registered']['workflow.create'] = [hookFn];

			await externalHooks.run('workflow.create', [workflowData]);

			expect(hookFn).toHaveBeenCalledTimes(1);

			const hookInvocationContext = hookFn.mock.instances[0] as Record<string, unknown>;
			expect(hookInvocationContext).toHaveProperty('dbCollections');
			expect(hookInvocationContext.dbCollections).toEqual({
				User: userRepository,
				Settings: settingsRepository,
				Credentials: credentialsRepository,
				Workflow: workflowRepository,
			});
		});

		it('should report error if hook execution fails', async () => {
			const error = new Error('Hook failed');
			hookFn.mockRejectedValueOnce(error);

			externalHooks['registered']['workflow.create'] = [hookFn];

			await expect(externalHooks.run('workflow.create', [workflowData])).rejects.toThrow(error);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'External hook "workflow.create" failed',
					cause: error,
				}),
				{ level: 'fatal' },
			);
			expect(logger.error).toHaveBeenCalledWith(
				'There was a problem running hook "workflow.create"',
			);
		});
	});
});
