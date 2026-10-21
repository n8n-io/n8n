import type { User } from '@n8n/db';
import {
	runCloudBrowserAgent,
	type BackgroundTaskManager,
	type CloudBrowserCredentialToCreate,
	type InstanceAiEventBus,
	type Logger,
} from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { BrowserDomainGate } from '../browser/browser.helpers';
import type { CloudBrowserLocalMcpServer } from '../browser/cloud-browser-local-mcp-server';
import type { InstanceAiCloudBrowserService } from '../browser/instance-ai-cloud-browser.service';
import {
	InstanceAiCloudBrowserTaskService,
	type CloudBrowserRunOptions,
	type InstanceAiCloudBrowserTaskServiceOptions,
} from '../browser/instance-ai-cloud-browser-task.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal()),
	runCloudBrowserAgent: vi.fn(),
}));

describe('InstanceAiCloudBrowserTaskService', () => {
	const basicAuthFields: CloudBrowserCredentialToCreate['fields'] = [
		{ name: 'user', displayName: 'User', type: 'string', required: true },
		{ name: 'password', displayName: 'Password', type: 'string', required: true },
	];

	function setup() {
		const backgroundTaskManager = mock<BackgroundTaskManager>();
		backgroundTaskManager.spawn.mockReturnValue({ status: 'started' } as ReturnType<
			BackgroundTaskManager['spawn']
		>);
		const cloudBrowserService = mock<InstanceAiCloudBrowserService>();
		cloudBrowserService.createServer.mockResolvedValue(mock<CloudBrowserLocalMcpServer>());
		vi.mocked(runCloudBrowserAgent).mockResolvedValue({
			outcome: 'succeeded',
			summary: 'Created the credential',
			status: 'completed',
			agentRunId: 'agent-run-1',
			usage: [],
		} as Awaited<ReturnType<typeof runCloudBrowserAgent>>);

		const service = new InstanceAiCloudBrowserTaskService(
			mock<InstanceAiCloudBrowserTaskServiceOptions>({
				eventBus: mock<InstanceAiEventBus>(),
				logger: mock<Logger>(),
				backgroundTaskManager,
				cloudBrowserService,
				agentMemory: { patchThread: vi.fn(async () => {}) },
			}),
		);
		const getCredentialFields = vi.fn(async (type: string) =>
			type === 'httpBasicAuth' ? basicAuthFields : [],
		);
		const run: CloudBrowserRunOptions = {
			runId: 'run-1',
			user: mock<User>({ id: 'user-1' }),
			threadId: 'thread-1',
			modelId: 'anthropic/claude-sonnet-4-5',
			domainGate: mock<BrowserDomainGate>(),
			getCredentialFields,
		};
		/** Runs the task body the service handed to the background task manager. */
		const runSpawnedTask = async () =>
			await backgroundTaskManager.spawn.mock.calls[0][0].run(
				new AbortController().signal,
				() => [],
				async () => {},
				{},
			);

		return { service, backgroundTaskManager, run, runSpawnedTask };
	}

	describe('startTask', () => {
		it('gives the browser agent each credential to create with the fields of its type', async () => {
			const { service, run, runSpawnedTask } = setup();

			const result = await service.startTask(
				{
					title: 'Save test login',
					goal: 'Save the login shown on the page',
					credentialsToCreate: [{ type: 'httpBasicAuth', name: 'The Internet test login' }],
				},
				run,
			);
			await runSpawnedTask();

			expect(result.status).toBe('started');
			expect(runCloudBrowserAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					brief: {
						goal: 'Save the login shown on the page',
						startUrl: undefined,
						credentialsToCreate: [
							{ type: 'httpBasicAuth', name: 'The Internet test login', fields: basicAuthFields },
						],
					},
				}),
			);
		});

		it('rejects a credential type with no fields and starts no task', async () => {
			const { service, backgroundTaskManager, run } = setup();

			const result = await service.startTask(
				{
					title: 'Save test login',
					goal: 'Save the login shown on the page',
					credentialsToCreate: [{ type: 'notARealType', name: 'Test login' }],
				},
				run,
			);

			expect(result).toEqual({
				status: 'rejected',
				message: expect.stringContaining('"notARealType"'),
			});
			expect(backgroundTaskManager.spawn).not.toHaveBeenCalled();
		});

		it('rejects credentials to create when the host cannot look up credential types', async () => {
			const { service, backgroundTaskManager, run } = setup();

			const result = await service.startTask(
				{
					title: 'Save test login',
					goal: 'Save the login shown on the page',
					credentialsToCreate: [{ type: 'httpBasicAuth', name: 'Test login' }],
				},
				{ ...run, getCredentialFields: undefined },
			);

			expect(result).toEqual({
				status: 'rejected',
				message: expect.stringContaining('not available'),
			});
			expect(backgroundTaskManager.spawn).not.toHaveBeenCalled();
		});
	});
});
