import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ExecutionRedactionServiceProxy, RedactableExecution } from '@n8n/backend-services';
import type {
	CredentialsRepository,
	IExecutionResponse,
	User,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import {
	AgentThreadRedactionService,
	threadReaderFromRequest,
} from '../agent-thread-redaction.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';

const viewer = mock<User>({ id: 'viewer' });

function workflowToolCall(workflowId: string, executionId: string): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'workflow',
		name: 'run_wf',
		toolCallId: `call-${executionId}`,
		input: { query: 'input' },
		output: { executionId, status: 'success', data: { Node: [{ value: 'SECRET' }] } },
		startTime: 1,
		endTime: 2,
		success: true,
		workflowId,
		workflowExecutionId: executionId,
	};
}

function turn(id: string, timeline: TimelineEvent[]): AgentExecution {
	return {
		id,
		threadId: 'thread-1',
		status: 'success',
		userMessage: 'Run the workflow',
		timeline,
		error: 'failed with SECRET',
		failureSummary: null,
	} as unknown as AgentExecution;
}

const text = (content: string): TimelineEvent => ({ type: 'text', content, timestamp: 3 });

/** Source executions by id. A workflow id listed in `redacted` is redacted for the reader. */
function setup(options: {
	executions: Record<string, { workflowId: string } | undefined>;
	redacted?: Record<string, { canReveal: boolean }>;
	workflows?: Record<string, Partial<WorkflowEntity>>;
	revealForbidden?: boolean;
	/** Reveal right of the reader for a workflow that redacts all executions. Licensed when set. */
	policyAllCanReveal?: boolean;
	/** Thrown by the execution read, by execution id. */
	readErrors?: Record<string, Error>;
	/** Credential ids that are private (resolvable). */
	privateCredentialIds?: string[];
	/** Source execution ids whose run data is above the display size. */
	oversized?: string[];
}) {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const executionPersistence = mock<ExecutionPersistence>();
	const redactionProxy = mock<ExecutionRedactionServiceProxy>();
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	credentialsRepository.hasResolvableCredential.mockImplementation(async (ids: string[]) =>
		ids.some((id) => options.privateCredentialIds?.includes(id)),
	);

	executionPersistence.findSingleExecution.mockImplementation(async (id: string) => {
		const readError = options.readErrors?.[id];
		if (readError) throw readError;
		const source = options.executions[id];
		if (!source) return undefined;
		return {
			id,
			mode: 'integrated',
			workflowId: source.workflowId,
			workflowData: { settings: {}, nodes: [] },
			data: { resultData: { runData: {} } },
			...(options.oversized?.includes(id) ? { dataTooLargeToDisplay: true } : {}),
		} as unknown as IExecutionResponse;
	});

	redactionProxy.processExecutions.mockImplementation(
		async (executions: RedactableExecution[], { redactExecutionData }) => {
			for (const execution of executions) {
				const policyAll =
					options.policyAllCanReveal !== undefined &&
					execution.workflowData.settings?.redactionPolicy === 'all'
						? { canReveal: options.policyAllCanReveal }
						: undefined;
				const rule = options.redacted?.[execution.workflowId] ?? policyAll;
				if (!rule) continue;
				if (redactExecutionData === false) {
					if (!rule.canReveal || options.revealForbidden) throw new ForbiddenError();
					continue;
				}
				execution.data.redactionInfo = {
					isRedacted: true,
					reason: 'workflow_redaction_policy',
					canReveal: rule.canReveal,
				};
			}
		},
	);

	workflowRepository.findOneBy.mockImplementation(async (where) => {
		const id = (where as { id: string }).id;
		const workflow = options.workflows?.[id];
		return workflow ? ({ id, settings: {}, nodes: [], ...workflow } as WorkflowEntity) : null;
	});

	const service = new AgentThreadRedactionService(
		logger,
		executionPersistence,
		redactionProxy,
		workflowRepository,
		mock<GlobalConfig>({ executions: { maxDisplaySize: 1024 } }),
		credentialsRepository,
	);
	return { service, executionPersistence, redactionProxy, workflowRepository };
}

describe('AgentThreadRedactionService', () => {
	it('should return the turns unchanged when no workflow tool output is redacted', async () => {
		const { service } = setup({ executions: { e1: { workflowId: 'wf-open' } } });
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1'), text('SECRET')])];

		const result = await service.redactForReader(turns, { user: viewer });

		expect(result).toEqual(turns);
		expect(result[0].redaction).toBeUndefined();
	});

	it('should remove workflow tool data and model text when the source execution is redacted', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [
			turn('t1', [workflowToolCall('wf-redacted', 'e1'), text('The value is SECRET')]),
		];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(JSON.stringify(result)).not.toContain('SECRET');
		expect(result.redaction).toEqual({
			isRedacted: true,
			reason: 'workflow_redaction_policy',
			canReveal: false,
		});
		expect(result.timeline).toEqual([
			expect.objectContaining({
				type: 'tool-call',
				name: 'run_wf',
				workflowId: 'wf-redacted',
				workflowExecutionId: 'e1',
				input: undefined,
				output: undefined,
				redacted: true,
			}),
			expect.objectContaining({ type: 'text', content: '', redacted: true }),
		]);
		expect(result.userMessage).toBe('Run the workflow');
	});

	it('should not change the turns it receives', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		await service.redactForReader(turns, { user: viewer });

		expect(JSON.stringify(turns)).toContain('SECRET');
	});

	it('should redact the later turns of the thread but not the earlier ones', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: true } },
		});
		const turns = [
			turn('t0', [text('before')]),
			turn('t1', [workflowToolCall('wf-redacted', 'e1')]),
			turn('t2', [text('later reply about SECRET')]),
		];

		const result = await service.redactForReader(turns, { user: viewer });

		expect(result[0].redaction).toBeUndefined();
		expect(result[0].timeline).toEqual([text('before')]);
		expect(result[1].redaction?.canReveal).toBe(true);
		expect(result[2].redaction?.canReveal).toBe(true);
		expect(JSON.stringify(result.slice(1))).not.toContain('SECRET');
	});

	it('should allow a reveal of a later turn only when every earlier source can be revealed', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-a' }, e2: { workflowId: 'wf-b' } },
			redacted: { 'wf-a': { canReveal: false }, 'wf-b': { canReveal: true } },
		});
		const turns = [
			turn('t1', [workflowToolCall('wf-a', 'e1')]),
			turn('t2', [workflowToolCall('wf-b', 'e2')]),
		];

		const result = await service.redactForReader(turns, { user: viewer });

		expect(result[1].redaction?.canReveal).toBe(false);
	});

	it('should return the turns unredacted on a reveal that the reader is allowed to make', async () => {
		const { service, redactionProxy } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: true } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		const result = await service.redactForReader(turns, {
			user: viewer,
			revealExecutionData: true,
		});

		expect(result).toEqual(turns);
		expect(redactionProxy.processExecutions).toHaveBeenCalledWith(expect.any(Array), {
			user: viewer,
			redactExecutionData: false,
		});
	});

	it('should reject a reveal that the reader is not allowed to make', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		await expect(
			service.redactForReader(turns, { user: viewer, revealExecutionData: true }),
		).rejects.toThrow(ForbiddenError);
	});

	it('should redact a pruned source execution and let the redaction service decide the reveal', async () => {
		const { service, redactionProxy } = setup({
			executions: { e1: undefined },
			workflows: { 'wf-open': {} },
			policyAllCanReveal: true,
		});
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction).toEqual({
			isRedacted: true,
			reason: 'source_unavailable',
			canReveal: true,
		});
		const [[standIns]] = redactionProxy.processExecutions.mock.calls;
		expect(standIns).toEqual([
			expect.objectContaining({
				id: 'e1',
				workflowId: 'wf-open',
				workflowData: expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			}),
		]);
	});

	it('should keep a pruned source visible when the instance does not redact data', async () => {
		const { service } = setup({ executions: { e1: undefined }, workflows: { 'wf-open': {} } });
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction).toBeUndefined();
	});

	it('should decide a source that fails to load like a missing one', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-open' } },
			workflows: { 'wf-open': {} },
			policyAllCanReveal: false,
			readErrors: { e1: new Error('corrupt') },
		});
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1'), text('SECRET')])];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction).toEqual({
			isRedacted: true,
			reason: 'source_unavailable',
			canReveal: false,
		});
	});

	it.each([
		[
			'uses a private credential',
			{
				nodes: [
					{
						name: 'Fetch',
						type: 'n8n-nodes-base.httpRequest',
						credentials: { api: { id: 'cred-private', name: 'api' } },
					},
				],
			},
		],
		[
			'calls other workflows',
			{ nodes: [{ name: 'Call', type: 'n8n-nodes-base.executeWorkflow' }] },
		],
	])(
		'should redact a pruned source without a reveal when the workflow %s',
		async (_case, workflow) => {
			const { service } = setup({
				executions: { e1: undefined },
				workflows: { 'wf-open': workflow as Partial<WorkflowEntity> },
				policyAllCanReveal: true,
				privateCredentialIds: ['cred-private'],
			});
			const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

			const [result] = await service.redactForReader(turns, {
				user: viewer,
				revealExecutionData: true,
			});

			expect(result.redaction).toEqual({
				isRedacted: true,
				reason: 'source_unavailable',
				canReveal: false,
			});
		},
	);

	it('should allow a reveal of a pruned source when the redaction service allows it', async () => {
		const { service, redactionProxy } = setup({
			executions: { e1: undefined },
			workflows: { 'wf-open': {} },
			policyAllCanReveal: true,
		});
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

		const [result] = await service.redactForReader(turns, {
			user: viewer,
			revealExecutionData: true,
		});

		expect(result.redaction).toBeUndefined();
		expect(redactionProxy.processExecutions).toHaveBeenLastCalledWith(
			[expect.objectContaining({ id: 'e1' })],
			{ user: viewer, redactExecutionData: false },
		);
	});

	it('should decide a source above the display size like a missing one', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-open' } },
			workflows: {
				'wf-open': { nodes: [{ name: 'Call', type: 'n8n-nodes-base.executeWorkflow' }] } as never,
			},
			policyAllCanReveal: true,
			oversized: ['e1'],
		});
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction).toEqual({
			isRedacted: true,
			reason: 'source_unavailable',
			canReveal: false,
		});
	});

	it('should redact without a reveal when the source execution and its workflow are gone', async () => {
		const { service } = setup({ executions: { e1: undefined } });
		const turns = [turn('t1', [workflowToolCall('wf-deleted', 'e1')])];

		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction).toEqual({
			isRedacted: true,
			reason: 'source_unavailable',
			canReveal: false,
		});
	});

	it('should not redact for the end user of a channel or app session', async () => {
		const { service, executionPersistence } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		const result = await service.redactForReader(turns, { sessionEndUserId: 'end-user' });

		expect(result).toBe(turns);
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it('should redact a turn that delegated to a sub-agent which ran a redacted workflow', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [turn('t1', [text('The sub-agent found SECRET')])];
		const delegatedTimelines = new Map([['t1', [workflowToolCall('wf-redacted', 'e1')]]]);

		const [result] = await service.redactForReader(turns, { user: viewer }, { delegatedTimelines });

		expect(result.redaction?.isRedacted).toBe(true);
		expect(JSON.stringify(result)).not.toContain('SECRET');
	});

	it('should pass the request details to the reveal', async () => {
		const { service, redactionProxy } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: true } },
		});

		await service.redactForReader([turn('t1', [workflowToolCall('wf-redacted', 'e1')])], {
			user: viewer,
			revealExecutionData: true,
			ipAddress: '127.0.0.1',
			userAgent: 'agent',
		});

		expect(redactionProxy.processExecutions).toHaveBeenCalledWith(expect.any(Array), {
			user: viewer,
			redactExecutionData: false,
			ipAddress: '127.0.0.1',
			userAgent: 'agent',
		});
	});

	it('should reuse a redacted decision on the next read without loading the source again', async () => {
		const { service, executionPersistence } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		await service.redactForReader(turns, { user: viewer });
		const [result] = await service.redactForReader(turns, { user: viewer });

		expect(result.redaction?.isRedacted).toBe(true);
		expect(executionPersistence.findSingleExecution).toHaveBeenCalledTimes(1);
	});

	it('should load the source again for a source that is not redacted', async () => {
		const { service, executionPersistence } = setup({
			executions: { e1: { workflowId: 'wf-open' } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-open', 'e1')])];

		await service.redactForReader(turns, { user: viewer });
		await service.redactForReader(turns, { user: viewer });

		expect(executionPersistence.findSingleExecution).toHaveBeenCalledTimes(2);
	});

	it('should not use a cached decision for a reveal', async () => {
		const { service, executionPersistence, redactionProxy } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: true } },
		});
		const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

		await service.redactForReader(turns, { user: viewer });
		const [revealed] = await service.redactForReader(turns, {
			user: viewer,
			revealExecutionData: true,
		});

		expect(revealed.redaction).toBeUndefined();
		expect(executionPersistence.findSingleExecution).toHaveBeenCalledTimes(2);
		expect(redactionProxy.processExecutions).toHaveBeenLastCalledWith(expect.any(Array), {
			user: viewer,
			redactExecutionData: false,
		});
	});

	describe('audit of repeated reveals', () => {
		const reveal = { user: viewer, revealExecutionData: true } as const;

		function auditedReveals(redactionProxy: ReturnType<typeof setup>['redactionProxy']) {
			return redactionProxy.processExecutions.mock.calls.filter(
				([, options]) => options.redactExecutionData === false,
			).length;
		}

		it('should audit a repeated reveal of the same thread sources once, and still check the reveal right', async () => {
			const { service, redactionProxy } = setup({
				executions: { e1: { workflowId: 'wf-redacted' } },
				redacted: { 'wf-redacted': { canReveal: true } },
			});
			const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

			await service.redactForReader(turns, reveal);
			const [second] = await service.redactForReader(turns, reveal);

			expect(second.redaction).toBeUndefined();
			expect(auditedReveals(redactionProxy)).toBe(1);
			// The second request went through the service without a reveal.
			expect(redactionProxy.processExecutions).toHaveBeenLastCalledWith(expect.any(Array), {
				user: viewer,
			});
		});

		it('should take the audited reveal path again when the user can no longer reveal', async () => {
			const redacted = { 'wf-redacted': { canReveal: true } };
			const { service, redactionProxy } = setup({
				executions: { e1: { workflowId: 'wf-redacted' } },
				redacted,
			});
			const turns = [turn('t1', [workflowToolCall('wf-redacted', 'e1')])];

			await service.redactForReader(turns, reveal);
			redacted['wf-redacted'].canReveal = false;

			await expect(service.redactForReader(turns, reveal)).rejects.toThrow(ForbiddenError);
			expect(auditedReveals(redactionProxy)).toBe(2);
		});

		it('should audit a reveal again in another thread and after the window', async () => {
			vi.useFakeTimers();
			try {
				const { service, redactionProxy } = setup({
					executions: { e1: { workflowId: 'wf-redacted' } },
					redacted: { 'wf-redacted': { canReveal: true } },
				});
				const call = workflowToolCall('wf-redacted', 'e1');

				await service.redactForReader([turn('t1', [call])], reveal);
				await service.redactForReader([{ ...turn('t2', [call]), threadId: 'thread-2' }], reveal);
				expect(auditedReveals(redactionProxy)).toBe(2);

				vi.advanceTimersByTime(5 * 60_000 + 1);
				await service.redactForReader([turn('t1', [call])], reveal);
				expect(auditedReveals(redactionProxy)).toBe(3);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	it('should redact a turn whose timeline did not load, and the turns after it', async () => {
		const { service } = setup({ executions: {} });
		const turns = [turn('t0', [text('before')]), turn('t1', []), turn('t2', [text('SECRET')])];

		const result = await service.redactForReader(
			turns,
			{ user: viewer },
			{ unreadableTurnIds: new Set(['t1']) },
		);

		expect(result[0].redaction).toBeUndefined();
		expect(result[1].redaction).toEqual({
			isRedacted: true,
			reason: 'source_unavailable',
			canReveal: false,
		});
		expect(JSON.stringify(result[2])).not.toContain('SECRET');
	});

	it('should resolve no redaction for the end user of a session', async () => {
		const { service } = setup({
			executions: { e1: { workflowId: 'wf-redacted' } },
			redacted: { 'wf-redacted': { canReveal: false } },
		});

		const decisions = await service.resolveForReader(
			[turn('t1', [workflowToolCall('wf-redacted', 'e1')])],
			{ sessionEndUserId: 'end-user' },
		);

		expect(decisions.size).toBe(0);
	});
});

describe('threadReaderFromRequest', () => {
	it('should ask for a reveal when the query sets redactExecutionData to false', () => {
		const reader = threadReaderFromRequest({
			user: viewer,
			query: { redactExecutionData: 'false' },
			ip: '10.0.0.1',
			headers: { 'user-agent': 'browser' } as never,
		});

		expect(reader).toEqual({
			user: viewer,
			revealExecutionData: true,
			ipAddress: '10.0.0.1',
			userAgent: 'browser',
		});
	});

	it('should not ask for a reveal without the query parameter', () => {
		const reader = threadReaderFromRequest({ user: viewer, query: {}, ip: undefined });

		expect(reader.revealExecutionData).toBeUndefined();
	});
});
