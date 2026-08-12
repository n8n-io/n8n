import type { Workspace } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { createToolRegistry } from '../../../tool-registry';
import type {
	OneOffTaskWorkspace,
	OrchestrationContext,
	SpawnBackgroundTaskResult,
} from '../../../types';
import { buildCredentialContext } from '../one-off-task-agent.prompt';
import {
	createReportResultTool,
	formatOneOffTaskReport,
	startOneOffTaskAgent,
} from '../one-off-task-agent.tool';

const input = {
	task: 'Create a Google Sheet named "Q3 leads" with columns Name, Email, Stage',
	credentialIds: ['cred-1'],
	conversationContext: undefined,
};

function makeTaskWorkspace(): OneOffTaskWorkspace {
	return {
		workspace: mock<Workspace>(),
		credentials: [
			{
				id: 'cred-1',
				name: 'Google Sheets account',
				type: 'googleSheetsOAuth2Api',
				envVarNames: ['GOOGLE_SHEETS_ACCESS_TOKEN'],
			},
		],
	};
}

function makeContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	const ctx = mock<OrchestrationContext>();
	ctx.threadId = 'thread-1';
	ctx.runId = 'run-1';
	ctx.orchestratorAgentId = 'root-agent';
	ctx.domainTools = createToolRegistry();
	ctx.tracing = undefined;
	ctx.eventBus = { publish: vi.fn() } as unknown as OrchestrationContext['eventBus'];
	ctx.oneOffTaskWorkspace = vi.fn(async () => await Promise.resolve(makeTaskWorkspace()));
	ctx.spawnBackgroundTask = vi.fn(
		(): SpawnBackgroundTaskResult => ({
			status: 'started',
			taskId: 'task-1',
			agentId: 'agent-1',
		}),
	);
	return Object.assign(ctx, overrides);
}

describe('startOneOffTaskAgent', () => {
	it('returns an error when the one-off-task capability is not wired', async () => {
		const ctx = makeContext({ oneOffTaskWorkspace: undefined });

		const result = await startOneOffTaskAgent(ctx, input);

		expect(result.result).toContain('not available');
		expect(result.taskId).toBe('');
	});

	it('returns an error when workspace preparation fails, without spawning', async () => {
		const ctx = makeContext({
			oneOffTaskWorkspace: vi.fn(async () => {
				await Promise.resolve();
				throw new Error('credential cred-1 not accessible');
			}),
		});

		const result = await startOneOffTaskAgent(ctx, input);

		expect(result.result).toContain('credential cred-1 not accessible');
		expect(ctx.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('returns an error when the sandbox workspace is unavailable', async () => {
		const ctx = makeContext({
			oneOffTaskWorkspace: vi.fn(async () => await Promise.resolve(undefined)),
		});

		const result = await startOneOffTaskAgent(ctx, input);

		expect(result.result).toContain('sandbox workspace is not available');
		expect(ctx.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('spawns a background task and publishes agent-spawned without credential values', async () => {
		const ctx = makeContext();

		const result = await startOneOffTaskAgent(ctx, input);

		const spawn = vi.mocked(ctx.spawnBackgroundTask!);
		expect(spawn).toHaveBeenCalledTimes(1);
		const spawnOptions = spawn.mock.calls[0][0];
		expect(spawnOptions.threadId).toBe('thread-1');
		expect(spawnOptions.role).toBe('one-off-task');
		expect(typeof spawnOptions.run).toBe('function');
		expect(result.result).toContain('One-off task started');
		expect(result.taskId).not.toBe('');

		const publish = vi.mocked(ctx.eventBus.publish);
		expect(publish).toHaveBeenCalledTimes(1);
		const [publishedThreadId, event] = publish.mock.calls[0];
		expect(publishedThreadId).toBe('thread-1');
		expect(event).toMatchObject({
			type: 'agent-spawned',
			payload: {
				parentId: 'root-agent',
				role: 'one-off-task',
				goal: input.task,
			},
		});
		// Env var names may appear in briefings, but never any value-shaped payload.
		expect(JSON.stringify(event)).not.toContain('ACCESS_TOKEN=');
	});

	it('relays duplicate and limit-reached spawn outcomes', async () => {
		const duplicate = makeContext({
			spawnBackgroundTask: vi.fn(
				(): SpawnBackgroundTaskResult => ({
					status: 'duplicate',
					existing: { taskId: 'task-9', agentId: 'agent-9', role: 'one-off-task' },
				}),
			),
		});
		const duplicateResult = await startOneOffTaskAgent(duplicate, input);
		expect(duplicateResult.result).toContain('already in progress');
		expect(duplicateResult.taskId).toBe('task-9');
		expect(duplicate.eventBus.publish).not.toHaveBeenCalled();

		const limited = makeContext({
			spawnBackgroundTask: vi.fn((): SpawnBackgroundTaskResult => ({ status: 'limit-reached' })),
		});
		const limitedResult = await startOneOffTaskAgent(limited, input);
		expect(limitedResult.result).toContain('limit reached');
		expect(limitedResult.taskId).toBe('');
	});
});

describe('report-result tool', () => {
	it('captures the report for the task body and formats it', async () => {
		const { tool, getReport } = createReportResultTool();
		expect(getReport()).toBeUndefined();

		const report = {
			status: 'completed' as const,
			summary: 'Created the sheet with 4 columns.',
			actionsTaken: ['created spreadsheet via Sheets API'],
			verification: 'Read the sheet back; it has columns Name, Email, Stage.',
			artifacts: [{ label: 'Q3 leads', url: 'https://sheets.example/1' }],
		};
		const output = await tool.handler!(report, {} as never);

		expect(output).toMatchObject({
			guidance: 'Report recorded. Stop now — reply with one short sentence.',
		});
		expect(getReport()).toEqual(report);

		const formatted = formatOneOffTaskReport(report);
		expect(formatted).toContain('Status: completed');
		expect(formatted).toContain('Read the sheet back');
		expect(formatted).toContain('https://sheets.example/1');
	});
});

describe('buildCredentialContext', () => {
	it('lists env var names, never values', () => {
		const context = buildCredentialContext([
			{
				id: 'cred-1',
				name: 'Google Sheets account',
				type: 'googleSheetsOAuth2Api',
				envVarNames: ['GOOGLE_SHEETS_ACCESS_TOKEN'],
			},
		]);

		expect(context).toContain('GOOGLE_SHEETS_ACCESS_TOKEN');
		expect(context).toContain('googleSheetsOAuth2Api');
	});

	it('returns undefined when no credentials were injected', () => {
		expect(buildCredentialContext([])).toBeUndefined();
	});
});
