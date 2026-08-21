import { mockLogger } from '@n8n/backend-test-utils';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import type { AiService } from '@/services/ai.service';

import { AgentSessionLangSmithExportService } from '../agent-session-langsmith-export.service';
import type { AgentExecutionService, ThreadDetail } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

const createRunMock = vi.hoisted(() => vi.fn());

vi.mock('langsmith', () => ({
	Client: class {
		createRun = createRunMock;
	},
}));

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'parent-thread',
		agentId: 'parent-agent',
		agentName: 'Parent Agent',
		projectId: 'project-1',
		title: 'Debug session',
		emoji: null,
		parentThreadId: null,
		parentAgentId: null,
		taskId: null,
		taskVersionId: null,
		sessionNumber: 1,
		totalPromptTokens: 12,
		totalCompletionTokens: 8,
		totalCost: 0.04,
		totalDuration: 1000,
		createdAt: new Date('2026-08-14T09:00:00.000Z'),
		updatedAt: new Date('2026-08-14T09:00:01.000Z'),
		...overrides,
	} as AgentExecutionThread;
}

function makeExecution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'parent-execution',
		threadId: 'parent-thread',
		status: 'success',
		startedAt: new Date('2026-08-14T09:00:00.000Z'),
		stoppedAt: new Date('2026-08-14T09:00:01.000Z'),
		duration: 1000,
		userMessage: 'Help robin@example.com',
		attachments: [
			{ id: 'attachment-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 42 },
		],
		model: 'anthropic/claude-sonnet',
		promptTokens: 12,
		completionTokens: 8,
		totalTokens: 20,
		cost: 0.04,
		timeline: [
			{
				type: 'text',
				content: 'Reply to robin@example.com',
				timestamp: Date.parse('2026-08-14T09:00:00.100Z'),
				endTime: Date.parse('2026-08-14T09:00:00.200Z'),
			},
			{
				type: 'tool-call',
				kind: 'tool',
				name: 'search',
				toolCallId: 'tool-success',
				input: {
					query: 'find docs',
					apiKey: 'top-secret-key',
					privateKey: 'first-value',
					private_key: 'second-value',
					'private-key': 'third-value',
					level1: {
						level2: {
							level3: {
								level4: {
									level5: {
										level6: {
											level7: {
												level8: { password: 'deep-boundary-secret' },
											},
										},
									},
								},
							},
						},
					},
				},
				output: { result: 'found' },
				startTime: Date.parse('2026-08-14T09:00:00.300Z'),
				endTime: Date.parse('2026-08-14T09:00:00.400Z'),
				success: true,
			},
			{
				type: 'tool-call',
				kind: 'node',
				name: 'failing_tool',
				toolCallId: 'tool-failure',
				input: {},
				output: { message: 'Failed for robin@example.com' },
				startTime: Date.parse('2026-08-14T09:00:00.500Z'),
				endTime: Date.parse('2026-08-14T09:00:00.600Z'),
				success: false,
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4,
				nodeDisplayName: 'HTTP Request',
				nodeParameters: { authentication: 'none' },
			},
			{
				type: 'tool-call',
				kind: 'tool',
				name: 'delegate_subagent',
				toolCallId: 'inline-child',
				input: { task: 'Inline research' },
				output: { answer: 'Inline answer' },
				startTime: Date.parse('2026-08-14T09:00:00.700Z'),
				endTime: Date.parse('2026-08-14T09:00:00.800Z'),
				success: true,
				childTrace: {
					text: 'Inline answer',
					reasoningSegments: [],
					steps: [{ toolCallId: 'inline-tool', toolName: 'lookup', running: false }],
				},
			},
			{
				type: 'tool-call',
				kind: 'tool',
				name: 'delegate_subagent',
				toolCallId: 'configured-child',
				input: { task: 'Configured research' },
				output: { threadId: 'child-thread', answer: 'Configured answer' },
				startTime: Date.parse('2026-08-14T09:00:00.900Z'),
				endTime: Date.parse('2026-08-14T09:00:01.000Z'),
				success: true,
			},
		],
		error: null,
		hitlStatus: null,
		source: 'chat',
		storedAt: 'db',
		createdAt: new Date('2026-08-14T09:00:00.000Z'),
		updatedAt: new Date('2026-08-14T09:00:01.000Z'),
		...overrides,
	} as AgentExecution;
}

function setup(
	options: {
		proxyEnabled?: boolean;
	} = {},
) {
	const agentExecutionService = mock<AgentExecutionService>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const aiService = mock<AiService>();
	aiService.isProxyEnabled.mockReturnValue(options.proxyEnabled ?? true);
	aiService.getClient.mockResolvedValue({
		getApiProxyBaseUrl: () => 'https://ai-proxy.example/v1/api-proxy',
		getBuilderApiProxyToken: vi.fn(),
	} as never);
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	const service = new AgentSessionLangSmithExportService(
		mockLogger(),
		aiService,
		outboundHttp,
		agentExecutionService,
		threadRepository,
	);

	return { service, agentExecutionService, threadRepository };
}

describe('AgentSessionLangSmithExportService', () => {
	const input = {
		projectId: 'project-1',
		agentId: 'parent-agent',
		threadId: 'parent-thread',
		user: mock<User>({ id: 'user-1' }),
	};

	beforeEach(() => {
		createRunMock.mockReset();
	});

	it('exports a complete redacted session tree with stable snapshot IDs', async () => {
		const { service, agentExecutionService, threadRepository } = setup();
		const parentDetail: ThreadDetail = {
			thread: makeThread(),
			executions: [makeExecution()],
		};
		const childThread = makeThread({
			id: 'child-thread',
			agentId: 'child-agent',
			agentName: 'Child Agent',
			parentThreadId: 'parent-thread',
			parentAgentId: 'parent-agent',
			createdAt: new Date('2026-08-14T09:00:00.900Z'),
		});
		const childDetail: ThreadDetail = {
			thread: childThread,
			executions: [
				makeExecution({
					id: 'child-execution',
					threadId: 'child-thread',
					userMessage: 'Child input',
					attachments: null,
					timeline: [
						{
							type: 'text',
							content: 'Child response',
							timestamp: Date.parse('2026-08-14T09:00:00.950Z'),
							endTime: Date.parse('2026-08-14T09:00:01.000Z'),
						},
					],
				}),
			],
		};
		agentExecutionService.getThreadDetail.mockImplementation(async (threadId) =>
			threadId === 'parent-thread' ? parentDetail : childDetail,
		);
		threadRepository.findByParentThreadId.mockImplementation(async (threadId) =>
			threadId === 'parent-thread' ? [childThread] : [],
		);

		let releaseLastRun = () => {};
		let blockLastRun = true;
		const lastRunBlocked = new Promise<void>((resolve) => {
			releaseLastRun = resolve;
		});
		createRunMock.mockImplementation(async (run: { outputs?: Record<string, unknown> }) => {
			if (blockLastRun && run.outputs?.text === 'Child response') {
				await lastRunBlocked;
			}
		});

		let resolved = false;
		const firstExport = service.exportSession(input).then((result) => {
			resolved = true;
			return result;
		});
		await vi.waitFor(() => expect(createRunMock).toHaveBeenCalledTimes(10));
		expect(resolved).toBe(false);
		releaseLastRun();
		const firstResult = await firstExport;
		const firstRuns = createRunMock.mock.calls.map(([run]) => run);

		expect(firstRuns.map((run) => run.name)).toEqual([
			'Agent session: Parent Agent',
			'Agent turn',
			'Agent response',
			'search',
			'failing_tool',
			'delegate_subagent',
			'delegate_subagent',
			'Agent session: Child Agent',
			'Agent turn',
			'Agent response',
		]);
		expect(JSON.stringify(firstRuns)).not.toContain('robin@example.com');
		expect(JSON.stringify(firstRuns)).not.toContain('top-secret-key');
		expect(JSON.stringify(firstRuns)).not.toContain('first-value');
		expect(JSON.stringify(firstRuns)).not.toContain('second-value');
		expect(JSON.stringify(firstRuns)).not.toContain('third-value');
		expect(JSON.stringify(firstRuns)).not.toContain('deep-boundary-secret');
		expect(JSON.stringify(firstRuns)).toContain('[REDACTED]');
		expect(firstRuns[0].extra.metadata.n8nVersion).toBe(N8N_VERSION);
		expect(firstRuns[1].inputs.attachments).toEqual([
			{ id: 'attachment-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 42 },
		]);
		expect(firstRuns[4]).toMatchObject({
			error: 'Failed for [REDACTED]',
			extra: { metadata: { success: false, nodeType: 'n8n-nodes-base.httpRequest' } },
		});
		expect(firstRuns[5].outputs.childTrace).toMatchObject({
			text: 'Inline answer',
			steps: [{ toolName: 'lookup' }],
		});
		expect(firstRuns[7].parent_run_id).toBe(firstRuns[6].id);

		blockLastRun = false;
		createRunMock.mockClear();
		const secondResult = await service.exportSession(input);
		const secondRuns = createRunMock.mock.calls.map(([run]) => run);
		expect(secondResult.traceId).toBe(firstResult.traceId);
		expect(secondRuns.map((run) => run.id)).toEqual(firstRuns.map((run) => run.id));

		parentDetail.executions.push(
			makeExecution({
				id: 'new-execution',
				startedAt: new Date('2026-08-14T09:00:02.000Z'),
				stoppedAt: new Date('2026-08-14T09:00:03.000Z'),
				timeline: [],
			}),
		);
		const changedResult = await service.exportSession(input);
		expect(changedResult.traceId).not.toBe(firstResult.traceId);
	});

	it('exports HITL response timeline events', async () => {
		const { service, agentExecutionService, threadRepository } = setup();
		agentExecutionService.getThreadDetail.mockResolvedValue({
			thread: makeThread(),
			executions: [
				makeExecution({
					timeline: [
						{
							type: 'hitl-response',
							toolCallId: 'tool-approval',
							response: { approved: false, reason: 'Needs changes' },
							timestamp: Date.parse('2026-08-14T09:00:00.500Z'),
						},
					],
				}),
			],
		});
		threadRepository.findByParentThreadId.mockResolvedValue([]);

		await service.exportSession(input);

		const hitlRun = createRunMock.mock.calls
			.map(([run]) => run)
			.find(({ name }) => name === 'HITL response');
		expect(hitlRun).toMatchObject({
			inputs: { toolCallId: 'tool-approval' },
			outputs: { approved: false, reason: 'Needs changes' },
		});
	});

	it('rejects before loading data when the AI proxy is disabled', async () => {
		const { service, agentExecutionService } = setup({ proxyEnabled: false });

		await expect(service.exportSession(input)).rejects.toThrow(
			'LangSmith debug export is not enabled',
		);
		expect(agentExecutionService.getThreadDetail).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
	});

	it('rejects inaccessible sessions without submitting a run', async () => {
		const { service } = setup();

		await expect(service.exportSession(input)).rejects.toThrow('Thread "parent-thread" not found');
		expect(createRunMock).not.toHaveBeenCalled();
	});

	it('rejects when a child session is still running', async () => {
		const child = setup();
		const childThread = makeThread({
			id: 'child-thread',
			agentId: 'child-agent',
			parentThreadId: 'parent-thread',
			parentAgentId: 'parent-agent',
		});
		child.agentExecutionService.getThreadDetail.mockImplementation(async (threadId) => ({
			thread: threadId === 'parent-thread' ? makeThread() : childThread,
			executions: [makeExecution({ status: threadId === 'parent-thread' ? 'success' : 'running' })],
		}));
		child.threadRepository.findByParentThreadId.mockImplementation(async (threadId) =>
			threadId === 'parent-thread' ? [childThread] : [],
		);
		await expect(child.service.exportSession(input)).rejects.toThrow('Session is still running');
		expect(createRunMock).not.toHaveBeenCalled();
	});

	it('rejects when blob-stored execution data is unavailable', async () => {
		const { service, agentExecutionService } = setup();
		agentExecutionService.getThreadDetail.mockResolvedValue({
			thread: makeThread(),
			executions: [makeExecution({ storedAt: 'fs', timeline: null })],
		});

		await expect(service.exportSession(input)).rejects.toMatchObject({
			message:
				"Session couldn't be exported because some execution data is unavailable. Try again.",
			httpStatusCode: 503,
		});
		expect(createRunMock).not.toHaveBeenCalled();
	});

	it('rejects cyclic child links without submitting a run', async () => {
		const { service, agentExecutionService, threadRepository } = setup();
		const rootThread = makeThread({
			parentThreadId: 'child-thread',
			parentAgentId: 'child-agent',
		});
		const childThread = makeThread({
			id: 'child-thread',
			agentId: 'child-agent',
			parentThreadId: 'parent-thread',
			parentAgentId: 'parent-agent',
		});
		agentExecutionService.getThreadDetail.mockImplementation(async (threadId) => ({
			thread: threadId === 'parent-thread' ? rootThread : childThread,
			executions: [makeExecution({ threadId })],
		}));
		threadRepository.findByParentThreadId.mockImplementation(async (threadId) =>
			threadId === 'parent-thread' ? [childThread] : [rootThread],
		);

		await expect(service.exportSession(input)).rejects.toThrow(
			'Agent session contains a cyclic child link',
		);
		expect(createRunMock).not.toHaveBeenCalled();
	});

	it('returns a retryable error when LangSmith submission fails', async () => {
		const { service, agentExecutionService, threadRepository } = setup();
		agentExecutionService.getThreadDetail.mockResolvedValue({
			thread: makeThread(),
			executions: [makeExecution({ timeline: [] })],
		});
		threadRepository.findByParentThreadId.mockResolvedValue([]);
		createRunMock.mockRejectedValueOnce(new Error('upstream unavailable'));

		await expect(service.exportSession(input)).rejects.toThrow(
			"Session couldn't be sent to LangSmith. Try again.",
		);
	});
});
