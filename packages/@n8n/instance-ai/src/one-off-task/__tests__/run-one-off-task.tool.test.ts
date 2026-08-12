import type { InstanceAiEvent } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { OrchestrationContext } from '../../types';
import type {
	HarnessReport,
	HarnessRunResult,
	OneOffTaskCredentialResolver,
	OneOffTaskSandbox,
	ResolvedCredentialEnv,
} from '../contracts';
import {
	createRunOneOffTaskTool,
	type OneOffTaskOutcome,
	type OneOffTaskSandboxProvider,
	type OneOffTaskToolDeps,
} from '../run-one-off-task.tool';

// ── Fixtures ────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN = 'ya29.secret-token';

const completedReport: HarnessReport = {
	status: 'completed',
	summary: 'Created the sheet.',
	actions: [{ description: 'POST sheets.googleapis.com/v4/spreadsheets', service: 'sheets' }],
	verification: [{ check: 'header row', result: '4 columns present', passed: true }],
	artifacts: [{ label: 'Leads sheet', url: 'https://docs.google.com/spreadsheets/d/1' }],
};

const needsCredentialReport: HarnessReport = {
	status: 'needs_credential',
	progressSummary: 'Fetched the source rows; need Slack to post the digest.',
	request: { kind: 'existing', credentialName: 'Slack Bot' },
};

const failedReport: HarnessReport = {
	status: 'failed',
	reason: 'The spreadsheet API rejected the request.',
	actions: [{ description: 'POST sheets.googleapis.com/v4/spreadsheets' }],
};

const baseInput = {
	goal: 'Create a Google Sheet named "Leads" with 4 columns.',
	constraints: ['Create at most one new file'],
	verification: 'The sheet exists with the 4 requested columns.',
	credentials: [
		{ credentialId: 'cred-google', name: 'Google Sheets', type: 'googleSheetsOAuth2Api' },
	],
	credentialCatalog: [{ name: 'Slack Bot', type: 'slackApi' }],
};

// ── Mocks ───────────────────────────────────────────────────────────────────

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		projectId: 'project-1',
		orchestratorAgentId: 'orchestrator-1',
		modelId: 'test-model',
		eventBus: { publish: vi.fn(), subscribe: vi.fn() },
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		abortSignal: new AbortController().signal,
		...overrides,
	} as unknown as OrchestrationContext;
}

type HarnessOptions = Parameters<OneOffTaskSandbox['runHarness']>[0];

function createMockSandbox(
	runHarness: (options: HarnessOptions) => Promise<HarnessRunResult>,
): OneOffTaskSandbox {
	return {
		bootstrap: vi.fn(async () => await Promise.resolve()),
		runHarness: vi.fn(runHarness),
		destroy: vi.fn(async () => await Promise.resolve()),
	};
}

function harnessOptions(sandbox: OneOffTaskSandbox): HarnessOptions {
	const call = (sandbox.runHarness as Mock).mock.calls[0] as [HarnessOptions];
	return call[0];
}

function createDeps(sandbox: OneOffTaskSandbox): OneOffTaskToolDeps & {
	sandboxProvider: { create: Mock; reattach: Mock };
	credentialResolver: { resolveForOneOffTask: Mock };
} {
	const sandboxProvider = {
		create: vi.fn(async () => await Promise.resolve({ sandbox, sandboxRef: 'sb-fresh-1' })),
		reattach: vi.fn(async () => await Promise.resolve(sandbox)),
	} satisfies OneOffTaskSandboxProvider;
	const credentialResolver = {
		resolveForOneOffTask: vi.fn(
			async ({ credentialId }: { credentialId: string }): Promise<ResolvedCredentialEnv> => {
				if (credentialId === 'cred-google') {
					return await Promise.resolve({
						envVars: { N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN: GOOGLE_TOKEN },
					});
				}
				return { envVars: { N8N_TASK_SLACK_BOT_TOKEN: 'xoxb-slack-secret' } };
			},
		),
	} satisfies OneOffTaskCredentialResolver;
	return { sandboxProvider, credentialResolver };
}

function publishedEvents(context: OrchestrationContext): InstanceAiEvent[] {
	return (context.eventBus.publish as Mock).mock.calls.map(
		(call: unknown[]) => call[1] as InstanceAiEvent,
	);
}

async function run(
	context: OrchestrationContext,
	deps: OneOffTaskToolDeps,
	input: Record<string, unknown>,
): Promise<OneOffTaskOutcome> {
	const tool = createRunOneOffTaskTool(context, deps);
	return await executeTool<OneOffTaskOutcome>(tool, input, {});
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('run-one-off-task tool', () => {
	describe('fresh task, completed', () => {
		it('bootstraps with a value-free manifest, injects env only into the exec, and destroys once', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			expect(outcome.outcome).toBe('completed');
			// Manifest: labels + env var names, never values.
			expect(sandbox.bootstrap).toHaveBeenCalledWith({
				version: 1,
				secrets: [
					{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', label: 'GOOGLE_SHEETS_ACCESS_TOKEN' },
				],
			});
			// Secret values reach only the harness exec env.
			const options = harnessOptions(sandbox);
			expect(options.env).toEqual({ N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN: GOOGLE_TOKEN });
			// Prompt carries the serialized contract.
			expect(options.prompt).toContain(baseInput.goal);
			expect(options.prompt).toContain('N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN');
			expect(options.prompt).not.toContain(GOOGLE_TOKEN);
			// Terminal outcome → destroyed exactly once.
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		});

		it('generates a session id once and returns it for future relaunches', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			const options = harnessOptions(sandbox);
			expect(outcome.sessionId).toBe(options.sessionId);
			expect(outcome.sessionId).toMatch(/^[0-9a-f-]{36}$/);
		});

		it('publishes agent-spawned and agent-completed on a dedicated agent branch', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			await run(context, deps, baseInput);

			const events = publishedEvents(context);
			const spawned = events.find((event) => event.type === 'agent-spawned');
			const completed = events.find((event) => event.type === 'agent-completed');
			expect(spawned).toMatchObject({
				runId: 'run-1',
				payload: { parentId: 'orchestrator-1', role: 'one-off-task' },
			});
			expect(completed).toMatchObject({
				payload: { role: 'one-off-task', status: 'completed', result: 'Created the sheet.' },
			});
			expect(spawned!.agentId).toBe(completed!.agentId);
			expect(spawned!.agentId).not.toBe('orchestrator-1');
		});

		it('scrubs secret values from streamed deltas and from the report fields', async () => {
			const leakyReport: HarnessReport = {
				...completedReport,
				summary: `Created the sheet using ${GOOGLE_TOKEN}.`,
				artifacts: [{ label: 'Sheet', url: `https://docs.google.com/?token=${GOOGLE_TOKEN}` }],
			};
			const sandbox = createMockSandbox(async ({ onEvent }) => {
				onEvent({
					type: 'message_update',
					assistantMessageEvent: { type: 'text_delta', delta: `auth with ${GOOGLE_TOKEN}` },
				});
				return await Promise.resolve({ report: leakyReport, exitCode: 0 });
			});
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			const delta = publishedEvents(context).find((event) => event.type === 'text-delta');
			expect(delta).toMatchObject({
				payload: { text: 'auth with [REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN]' },
			});
			expect(JSON.stringify(outcome)).not.toContain(GOOGLE_TOKEN);
			if (outcome.outcome !== 'completed') throw new Error('expected completed');
			expect(outcome.report.summary).toBe(
				'Created the sheet using [REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN].',
			);
		});
	});

	describe('needs_credential', () => {
		it('returns sandboxRef + sessionId and does NOT destroy the sandbox', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: needsCredentialReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			if (outcome.outcome !== 'needs_credential') throw new Error('expected needs_credential');
			expect(outcome.sandboxRef).toBe('sb-fresh-1');
			expect(outcome.sessionId).toMatch(/^[0-9a-f-]{36}$/);
			expect(outcome.request).toEqual({ kind: 'existing', credentialName: 'Slack Bot' });
			expect(outcome.progressSummary).toBe(needsCredentialReport.progressSummary);
			// The wait-timeout expectation is armed in the guidance.
			expect(outcome.guidance).toContain('within 10 minutes');
			expect(outcome.guidance).toContain('resume');
			expect(sandbox.destroy).not.toHaveBeenCalled();
		});
	});

	describe('relaunch', () => {
		const resumeInput = {
			...baseInput,
			credentials: [
				...baseInput.credentials,
				{ credentialId: 'cred-slack', name: 'Slack Bot', type: 'slackApi' },
			],
			priorReport: 'Fetched the source rows; need Slack to post the digest.',
			resume: { sandboxRef: 'sb-fresh-1', sessionId: '11111111-2222-3333-4444-555555555555' },
		};

		it('reattaches to the sandbox, reuses the session id, and injects the additional credential', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, resumeInput);

			expect(deps.sandboxProvider.reattach).toHaveBeenCalledWith('sb-fresh-1');
			expect(deps.sandboxProvider.create).not.toHaveBeenCalled();

			const options = harnessOptions(sandbox);
			expect(options.sessionId).toBe('11111111-2222-3333-4444-555555555555');
			expect(outcome.sessionId).toBe('11111111-2222-3333-4444-555555555555');
			// Both the original and the newly approved credential are injected.
			expect(options.env).toEqual({
				N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN: GOOGLE_TOKEN,
				N8N_TASK_SLACK_BOT_TOKEN: 'xoxb-slack-secret',
			});
			// The prior progress summary rides along in the prompt.
			expect(options.prompt).toContain(resumeInput.priorReport);
			// Manifest is rewritten so the in-sandbox redactor knows the new value's label.
			expect(sandbox.bootstrap).toHaveBeenCalledWith({
				version: 1,
				secrets: [
					{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', label: 'GOOGLE_SHEETS_ACCESS_TOKEN' },
					{ envVar: 'N8N_TASK_SLACK_BOT_TOKEN', label: 'SLACK_BOT_TOKEN' },
				],
			});
			// Completed after relaunch → destroyed exactly once.
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		});

		it('does not publish a second agent-spawned on relaunch', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			await run(context, deps, resumeInput);

			const events = publishedEvents(context);
			expect(events.filter((event) => event.type === 'agent-spawned')).toHaveLength(0);
			expect(events.some((event) => event.type === 'status')).toBe(true);
		});
	});

	describe('failed', () => {
		it('returns the failure report and destroys exactly once', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: failedReport, exitCode: 1 }),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			if (outcome.outcome !== 'failed') throw new Error('expected failed');
			expect(outcome.reason).toBe(failedReport.reason);
			expect(outcome.actions).toEqual(failedReport.actions);
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		});
	});

	describe('interrupted', () => {
		it('maps a missing report to interrupted with the external-state-unknown wording', async () => {
			const sandbox = createMockSandbox(async () => await Promise.resolve({ exitCode: 137 }));
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			if (outcome.outcome !== 'interrupted') throw new Error('expected interrupted');
			expect(outcome.summary).toContain('Task interrupted — external state unknown');
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		});

		it('maps an invalid report to interrupted', async () => {
			const sandbox = createMockSandbox(
				async () =>
					await Promise.resolve({
						report: { status: 'nonsense' } as unknown as HarnessReport,
						exitCode: 0,
					}),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			expect(outcome.outcome).toBe('interrupted');
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		});
	});

	describe('errors and abort', () => {
		it('destroys exactly once and rethrows when runHarness throws', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.reject(new Error('exec transport died')),
			);
			const deps = createDeps(sandbox);
			const context = createMockContext();

			await expect(run(context, deps, baseInput)).rejects.toThrow('exec transport died');
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);

			const completed = publishedEvents(context).find((event) => event.type === 'agent-completed');
			expect(completed).toMatchObject({ payload: { status: 'error' } });
		});

		it('marks the agent branch cancelled when the run was aborted', async () => {
			const abortController = new AbortController();
			const sandbox = createMockSandbox(async () => {
				abortController.abort();
				return await Promise.reject<HarnessRunResult>(new Error('aborted'));
			});
			const deps = createDeps(sandbox);
			const context = createMockContext({ abortSignal: abortController.signal });

			await expect(run(context, deps, baseInput)).rejects.toThrow('aborted');
			expect(sandbox.destroy).toHaveBeenCalledTimes(1);
			const completed = publishedEvents(context).find((event) => event.type === 'agent-completed');
			expect(completed).toMatchObject({ payload: { status: 'cancelled' } });
		});

		it('returns a failed outcome without provisioning when credential resolution is denied', async () => {
			const sandbox = createMockSandbox(
				async () => await Promise.resolve({ report: completedReport, exitCode: 0 }),
			);
			const deps = createDeps(sandbox);
			deps.credentialResolver.resolveForOneOffTask.mockRejectedValue(
				new UserError('You no longer have access to this credential'),
			);
			const context = createMockContext();

			const outcome = await run(context, deps, baseInput);

			if (outcome.outcome !== 'failed') throw new Error('expected failed');
			expect(outcome.reason).toContain('You no longer have access to this credential');
			expect(deps.sandboxProvider.create).not.toHaveBeenCalled();
			expect(sandbox.runHarness).not.toHaveBeenCalled();
		});
	});
});
