/**
 * Regression test for GHC-6339
 * Bug: $evaluateExpression throws error in Code node with task runners in secure mode
 *
 * GitHub Issue: https://github.com/n8n-io/n8n/issues/24307
 *
 * Expected: $evaluateExpression should work in secure mode (default)
 * Actual: Throws "Cannot assign to read only property '__lookupGetter__' of object '#<Object>'"
 *
 * ROOT CAUSE:
 * In production (NODE_ENV=production, secure mode), the task runner:
 * 1. Creates a VM context with frozen prototypes (js-task-runner.ts:200-208)
 * 2. Neuters Object.defineProperty in the VM context (js-task-runner.ts:698)
 * 3. When $evaluateExpression is called from user code, it triggers:
 *    - workflow-data-proxy.ts:1463: $evaluateExpression definition
 *    - workflow-expression.ts:55: getParameterValue()
 *    - expression.ts:482: initializeGlobalContext(data)
 * 4. initializeGlobalContext tries to assign properties to data object (expression.ts:262-298)
 * 5. These assignments fail because data comes from a frozen/secured VM context
 *
 * TEST LIMITATION:
 * These tests currently PASS in NODE_ENV=test because the task runner skips
 * prototype freezing in test mode (js-task-runner.ts:199). The bug only
 * manifests in production. When the bug is fixed, remove the `.skip` markers.
 *
 * WORKAROUND:
 * Setting N8N_RUNNERS_INSECURE_MODE=true works but disables security features.
 */

import type { IDataObject } from 'n8n-workflow';

import type { JsRunnerConfig } from '@/config/js-runner-config';
import { MainConfig } from '@/config/main-config';
import type { JSExecSettings } from '@/js-task-runner/js-task-runner';
import { JsTaskRunner } from '@/js-task-runner/js-task-runner';
import type { DataRequestResponse } from '@/runner-types';
import type { TaskParams } from '@/task-runner';

import { newDataRequestResponse, newTaskParamsWithSettings, wrapIntoJson } from './test-data';

jest.mock('ws');

describe('GHC-6339: $evaluateExpression in secure mode', () => {
	const createRunner = (jsRunnerOpts: Partial<JsRunnerConfig> = {}) => {
		const defaultConfig = new MainConfig();
		return new JsTaskRunner({
			baseRunnerConfig: {
				...defaultConfig.baseRunnerConfig,
				grantToken: 'grantToken',
				maxConcurrency: 1,
				taskBrokerUri: 'http://localhost',
				taskTimeout: 60,
			},
			jsRunnerConfig: {
				allowedBuiltInModules: '',
				allowedExternalModules: '',
				insecureMode: false, // Explicitly test secure mode (default)
				...jsRunnerOpts,
			},
			sentryConfig: {
				dsn: '',
				deploymentName: '',
				environment: '',
				n8nVersion: '',
				profilesSampleRate: 0,
				tracesSampleRate: 0,
			},
		});
	};

	const execTaskWithParams = async ({
		task,
		taskData,
		runner,
	}: {
		task: TaskParams<JSExecSettings>;
		taskData: DataRequestResponse;
		runner: JsTaskRunner;
	}) => {
		jest.spyOn(runner, 'requestData').mockResolvedValue(taskData);
		return await runner.executeTask(task, new AbortController().signal);
	};

	const executeForAllItems = async ({
		code,
		inputItems,
		runner,
	}: {
		code: string;
		inputItems: IDataObject[];
		runner: JsTaskRunner;
	}) => {
		return await execTaskWithParams({
			task: newTaskParamsWithSettings({
				code,
				nodeMode: 'runOnceForAllItems',
			}),
			taskData: newDataRequestResponse(inputItems.map(wrapIntoJson)),
			runner,
		});
	};

	describe('secure mode (default) - reproduction cases', () => {
		const secureRunner = createRunner({ insecureMode: false });

		/**
		 * Test case from bug report: Code node with simple arithmetic expression.
		 * TODO: Remove .skip once bug is fixed. This should pass.
		 */
		it.skip('should evaluate simple expression with $evaluateExpression', async () => {
			// Exact code from GitHub issue #24307
			const code = `
				return [{
					json: {
						responseText: $evaluateExpression('{{ 1 + 1 }}'),
					},
				}]
			`;

			const outcome = await executeForAllItems({
				code,
				inputItems: [{}],
				runner: secureRunner,
			});

			expect(outcome.result).toEqual([
				{
					json: {
						responseText: 2,
					},
				},
			]);
		});

		/**
		 * TODO: Remove .skip once bug is fixed. This should pass.
		 */
		it.skip('should evaluate expression with string concatenation', async () => {
			const code = `
				return [{
					json: {
						result: $evaluateExpression('{{ "1+1 = " + (1+1) }}'),
					},
				}]
			`;

			const outcome = await executeForAllItems({
				code,
				inputItems: [{ value: 42 }],
				runner: secureRunner,
			});

			expect(outcome.result).toEqual([
				{
					json: {
						result: '1+1 = 2',
					},
				},
			]);
		});

		/**
		 * TODO: Remove .skip once bug is fixed. This should pass.
		 */
		it.skip('should evaluate expression accessing input data ($json)', async () => {
			const code = `
				return [{
					json: {
						doubled: $evaluateExpression('{{ $json.value * 2 }}'),
					},
				}]
			`;

			const outcome = await executeForAllItems({
				code,
				inputItems: [{ value: 21 }],
				runner: secureRunner,
			});

			expect(outcome.result).toEqual([
				{
					json: {
						doubled: 42,
					},
				},
			]);
		});

		/**
		 * TODO: Remove .skip once bug is fixed. This should pass.
		 */
		it.skip('should handle $evaluateExpression in runOnceForEachItem mode', async () => {
			const task = newTaskParamsWithSettings({
				code: `
					return {
						json: {
							responseText: $evaluateExpression('{{ 1 + 1 }}'),
						},
					}
				`,
				nodeMode: 'runOnceForEachItem',
			});

			const outcome = await execTaskWithParams({
				task,
				taskData: newDataRequestResponse([wrapIntoJson({ test: 'data' })]),
				runner: secureRunner,
			});

			expect(outcome.result).toEqual([
				{
					json: {
						responseText: 2,
					},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('insecure mode (workaround)', () => {
		const insecureRunner = createRunner({ insecureMode: true });

		/**
		 * Verify the workaround (N8N_RUNNERS_INSECURE_MODE=true) works.
		 * This test should continue to pass - it documents that insecure mode
		 * bypasses the freezing that causes the bug.
		 */
		it('should work in insecure mode as a workaround', async () => {
			const code = `
				return [{
					json: {
						responseText: $evaluateExpression('{{ 1 + 1 }}'),
					},
				}]
			`;

			const outcome = await executeForAllItems({
				code,
				inputItems: [{}],
				runner: insecureRunner,
			});

			expect(outcome.result).toEqual([
				{
					json: {
						responseText: 2,
					},
				},
			]);
		});
	});
});
