import type { InstanceAiAgentNode } from '@n8n/api-types';

import { InstanceAiMemoryService } from '../instance-ai-memory.service';

const mockListMessages = vi.fn();
const mockGetThread = vi.fn();
const mockSaveThread = vi.fn();
const mockDeleteThread = vi.fn();
const mockDeleteThreadsByResourceIdPrefix = vi.fn();
const mockDeleteThreadsByResourceId = vi.fn();
const mockListThreads = vi.fn();
const mockSaveThreadWithProject = vi.fn();
const mockGetThreadProjectId = vi.fn();
const mockSaveMessages = vi.fn();
const mockAgentMemory = {
	listMessages: mockListMessages,
	getThread: mockGetThread,
	saveThread: mockSaveThread,
	deleteThread: mockDeleteThread,
	deleteThreadsByResourceIdPrefix: mockDeleteThreadsByResourceIdPrefix,
	deleteThreadsByResourceId: mockDeleteThreadsByResourceId,
	listThreads: mockListThreads,
	saveThreadWithProject: mockSaveThreadWithProject,
	getThreadProjectId: mockGetThreadProjectId,
	saveMessages: mockSaveMessages,
};

// Mock GlobalConfig
const mockDbSnapshotStorage = { getAll: vi.fn().mockResolvedValue([]) };
const mockCheckpointRepository = { findActiveByThreadId: vi.fn().mockResolvedValue([]) };
const mockEventLogRepository = { getForThread: vi.fn().mockResolvedValue([]) };
const mockDurableLogMetrics = { recordFoldRead: vi.fn(), notifyParserFallbacks: vi.fn() };

function createService(
	options: { threadTtlDays?: number; durableLog?: boolean } = {},
): InstanceAiMemoryService {
	const mockConfig = {
		instanceAi: {
			threadTtlDays: options.threadTtlDays ?? 0,
			durableLog: options.durableLog ?? false,
		},
		database: {
			type: 'postgresdb',
			postgresdb: {
				user: 'test',
				password: 'test',
				host: 'localhost',
				port: 5432,
				database: 'test',
			},
		},
	};
	const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
	return new InstanceAiMemoryService(
		mockLogger as never,
		mockConfig as never,
		mockAgentMemory as never,
		mockDbSnapshotStorage as never,
		mockCheckpointRepository as never,
		mockPendingConfirmationRepository as never,
		mockEventLogRepository as never,
		mockDurableLogMetrics as never,
	);
}

const mockPendingConfirmationRepository = {
	findLiveRequestIds: vi.fn(async () => new Set<string>()),
};

function makeTree(overrides?: Partial<InstanceAiAgentNode>): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Done!',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Done!' }],
		...overrides,
	};
}

function makeThread(id: string, updatedAt: string) {
	return {
		id,
		title: id,
		resourceId: 'user-1',
		metadata: {},
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date(updatedAt),
	};
}

describe('InstanceAiMemoryService.getRichMessages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDbSnapshotStorage.getAll.mockResolvedValue([]);
		mockListMessages.mockResolvedValue({ messages: [] });
	});

	it('should return parsed rich messages with agent trees from snapshots', async () => {
		const tree = makeTree();
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hello',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [{ type: 'text', text: 'Done!' }],
					createdAt: new Date('2026-01-01T00:00:01.000Z'),
				},
			],
		});
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{
				tree,
				runId: 'run_abc',
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				updatedAt: new Date('2026-01-01T00:00:01.000Z'),
			},
		]);

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		expect(result.messages[0].role).toBe('user');
		expect(result.messages[0].content).toBe('Hello');
		expect(result.messages[1].role).toBe('assistant');
		expect(result.messages[1].agentTree).toStrictEqual(tree);
		expect(result.messages[1].runId).toBe('run_abc');
	});

	it('should return parsed messages with flat tree when no snapshots exist', async () => {
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Here are your workflows' },
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'list-workflows',
							input: {},
							state: 'resolved',
							output: { workflows: [] },
						},
					],
					createdAt: new Date('2026-01-01T00:00:01.000Z'),
				},
			],
		});
		mockGetThread.mockResolvedValue({
			id: 'thread-1',
			title: 'Test',
			metadata: {},
		});

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		const assistant = result.messages[1];
		expect(assistant.agentTree).toBeDefined();
		expect(assistant.agentTree?.toolCalls).toHaveLength(1);
		expect(assistant.agentTree?.toolCalls[0].toolName).toBe('list-workflows');
		expect(assistant.agentTree?.toolCalls[0].isLoading).toBe(false);
	});

	it('should handle empty message list', async () => {
		mockListMessages.mockResolvedValue({ messages: [] });
		mockGetThread.mockResolvedValue({
			id: 'thread-1',
			title: 'Test',
			metadata: {},
		});

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toEqual([]);
	});

	it('surfaces in-flight checkpoint messages not yet committed to memory', async () => {
		// A turn that suspended at HITL never gets `saveToMemory` called by the
		// SDK. The inbound user message is persisted on receipt, but the
		// intermediate assistant messages (and any pending tool-call) live only
		// in `state.messageList.messages` until the turn resumes and completes.
		// The /messages endpoint should surface them so a page reload doesn't
		// drop in-flight artifacts.
		mockListMessages.mockResolvedValue({ messages: [] });
		mockCheckpointRepository.findActiveByThreadId.mockResolvedValueOnce([
			{
				key: 'run_abc',
				runId: 'run_abc',
				threadId: 'thread-1',
				expiredAt: null,
				state: {
					messageList: {
						messages: [
							{
								id: 'cp-user-1',
								role: 'user',
								content: [{ type: 'text', text: 'execute my workflow' }],
								createdAt: '2026-01-01T00:00:00.000Z',
							},
							{
								id: 'cp-assistant-1',
								role: 'assistant',
								content: [{ type: 'text', text: 'On it!' }],
								createdAt: '2026-01-01T00:00:01.000Z',
							},
						],
					},
				},
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				updatedAt: new Date('2026-01-01T00:00:01.000Z'),
			},
		]);

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		expect(result.messages[0]).toMatchObject({ id: 'cp-user-1', role: 'user' });
		expect(result.messages[0].content).toBe('execute my workflow');
		expect(result.messages[1]).toMatchObject({ id: 'cp-assistant-1', role: 'assistant' });
	});

	it('prefers stored messages over checkpoint duplicates with the same id', async () => {
		// When a previously suspended turn resumes and commits its messages to
		// memory, the same IDs appear in both places. The stored row wins so
		// any post-suspension edits the SDK made (e.g. final tool outcomes)
		// are not regressed by the stale checkpoint copy.
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-1',
					role: 'user',
					content: [{ type: 'text', text: 'final version' }],
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
			],
		});
		mockCheckpointRepository.findActiveByThreadId.mockResolvedValueOnce([
			{
				key: 'run_abc',
				expiredAt: null,
				state: {
					messageList: {
						messages: [
							{
								id: 'msg-1',
								role: 'user',
								content: [{ type: 'text', text: 'stale checkpoint copy' }],
								createdAt: '2026-01-01T00:00:00.000Z',
							},
						],
					},
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].content).toBe('final version');
	});

	it('tolerates a missing or unreadable checkpoint store', async () => {
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hello',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
			],
		});
		mockCheckpointRepository.findActiveByThreadId.mockRejectedValueOnce(new Error('db down'));

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});
});

describe('InstanceAiMemoryService.getRichMessages — durable-log fold-on-read', () => {
	function eventRow(event: { runId: string; [key: string]: unknown }, createdAt: Date) {
		return { runId: event.runId, createdAt, event };
	}

	const userMessage = {
		id: 'msg-u',
		role: 'user',
		content: 'Hello',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
	};
	const assistantMessage = {
		id: 'msg-a',
		role: 'assistant',
		content: [{ type: 'text', text: 'Done!' }],
		createdAt: new Date('2026-01-01T00:00:01.000Z'),
	};
	const at = new Date('2026-01-01T00:00:01.000Z');

	function toolCallRows(runId: string, count: number) {
		const rows = [];
		for (let i = 1; i <= count; i++) {
			rows.push(
				eventRow(
					{
						type: 'tool-call',
						runId,
						agentId: 'agent-001',
						payload: { toolCallId: `tc-${i}`, toolName: `tool-${i}`, args: {} },
					},
					at,
				),
				eventRow(
					{
						type: 'tool-result',
						runId,
						agentId: 'agent-001',
						payload: { toolCallId: `tc-${i}`, result: {} },
					},
					at,
				),
			);
		}
		return rows;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockDbSnapshotStorage.getAll.mockResolvedValue([]);
		mockEventLogRepository.getForThread.mockResolvedValue([]);
		mockListMessages.mockResolvedValue({ messages: [userMessage, assistantMessage] });
	});

	it('derives the tree from the log even when the stored snapshot is degenerate', async () => {
		// The stored snapshot was built over an evicted buffer: an empty
		// cancelled tree with none of the run's work (the INS-595 bug family).
		// Snapshot rows keep being written flag-on (the rollback path until Gate
		// B), but they are never read once the thread has log rows.
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{
				tree: makeTree({ status: 'cancelled', textContent: '', timeline: [], toolCalls: [] }),
				runId: 'run_abc',
				createdAt: at,
				updatedAt: at,
			},
		]);
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_abc',
					agentId: 'agent-001',
					payload: { messageId: 'm-1' },
				},
				at,
			),
			...toolCallRows('run_abc', 3),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_abc',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		const assistant = result.messages[1];
		expect(assistant.agentTree?.toolCalls).toHaveLength(3);
		expect(assistant.agentTree?.toolCalls.map((tc) => tc.toolName)).toEqual([
			'tool-1',
			'tool-2',
			'tool-3',
		]);
		expect(assistant.agentTree?.status).toBe('completed');
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
		// The stored rows are not even loaded: the snapshot query only runs when
		// the fold needs its fallback.
		expect(mockDbSnapshotStorage.getAll).not.toHaveBeenCalled();
	});

	it('renders a run that crashed before its snapshot was written', async () => {
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_abc',
					agentId: 'agent-001',
					payload: { messageId: 'm-1' },
				},
				at,
			),
			...toolCallRows('run_abc', 1),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_abc',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		const assistant = result.messages[1];
		expect(assistant.agentTree).toBeDefined();
		expect(assistant.agentTree?.toolCalls).toHaveLength(1);
		expect(assistant.runId).toBe('run_abc');
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
	});

	it('excludes the whole message group while any of its runs is active', async () => {
		// Group 'mg-2' has a completed run and an in-flight one (excluded by the
		// controller). Deriving a partial group tree from the completed run
		// would pair against a turn with no assistant message yet, so the whole
		// group stays out of history until the turn completes.
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_done',
					agentId: 'agent-001',
					payload: { messageId: 'm-1' },
				},
				at,
			),
			...toolCallRows('run_done', 1),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_done',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { messageId: 'm-2', messageGroupId: 'mg-2' },
				},
				at,
			),
			eventRow(
				{
					type: 'text-block',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { text: 'first segment of the in-flight turn' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_b',
					agentId: 'agent-001',
					payload: { messageId: 'm-2', messageGroupId: 'mg-2' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
		});

		// Only run_done's entry is derived; no partial 'mg-2' entry exists.
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
		expect(result.messages[1].agentTree?.toolCalls).toHaveLength(1);
	});

	it('renders nothing for a fold emptied by exclusion instead of falling back to stored snapshots', async () => {
		// The in-flight group is the thread's ONLY log content. Its completed
		// sibling run_a has a stored snapshot that would survive the loader's
		// exact-runId filter (only run_b is excluded) — falling back would
		// resurrect exactly the in-flight group state the exclusion keeps out
		// of history.
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{ tree: makeTree(), runId: 'run_a', createdAt: at, updatedAt: at },
		]);
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			...toolCallRows('run_a', 1),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_b',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
		});

		expect(mockDbSnapshotStorage.getAll).not.toHaveBeenCalled();
		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('excludes a group via live group ids when the excluded run has no persisted rows yet', async () => {
		// The active run_b just started: its run-start is still in the drain
		// queue, so the log alone cannot map it to 'mg-1'. The controller passes
		// the live group id, and the completed sibling run_a must not derive a
		// partial group entry.
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			...toolCallRows('run_a', 1),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
			excludeMessageGroupIds: ['mg-1'],
		});

		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
		expect(mockDbSnapshotStorage.getAll).not.toHaveBeenCalled();
		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('excludes an in-flight group when the caller passes no exclusions (multi-main sibling read)', async () => {
		// On a main that is not driving the run the controller's per-process run
		// state is empty, so no excludeRunIds arrive. The log alone must identify
		// the in-flight group: its run has a run-start but no terminal run-finish.
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_done',
					agentId: 'agent-001',
					payload: { messageId: 'm-1' },
				},
				at,
			),
			...toolCallRows('run_done', 1),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_done',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_live',
					agentId: 'agent-001',
					payload: { messageId: 'm-2', messageGroupId: 'mg-2' },
				},
				at,
			),
			eventRow(
				{
					type: 'text-block',
					runId: 'run_live',
					agentId: 'agent-001',
					payload: { text: 'partial segment driven by another main' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		// Only run_done's entry is derived, exactly as the driving main would.
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
		expect(result.messages[1].agentTree?.toolCalls).toHaveLength(1);
		expect(mockDbSnapshotStorage.getAll).not.toHaveBeenCalled();
	});

	it('renders nothing when the only group is in flight on another main instead of falling back', async () => {
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_live',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			eventRow(
				{
					type: 'text-block',
					runId: 'run_live',
					agentId: 'agent-001',
					payload: { text: 'partial segment driven by another main' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(mockDbSnapshotStorage.getAll).not.toHaveBeenCalled();
		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('keeps folding a HITL-suspended run without a run-finish', async () => {
		// A suspended run legitimately never wrote its run-finish, but its turn
		// must keep rendering: the fold entry pairs with the checkpoint-surfaced
		// assistant message. The suspension is recognized by the run's own
		// checkpoint — the same predicate that spares it from the interrupted-run
		// sweep.
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		mockCheckpointRepository.findActiveByThreadId.mockResolvedValueOnce([
			{
				key: 'cp-1',
				runId: 'sdk-run-1',
				hostRunId: 'run_susp',
				threadId: 'thread-1',
				expiredAt: null,
				state: {
					status: 'suspended',
					messageList: {
						messages: [
							{
								id: 'cp-assistant-1',
								role: 'assistant',
								content: [{ type: 'text', text: 'Confirm before I continue' }],
								createdAt: '2026-01-01T00:00:01.000Z',
							},
						],
					},
				},
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				updatedAt: new Date('2026-01-01T00:00:01.000Z'),
			},
		]);
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_susp',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			eventRow(
				{
					type: 'tool-call',
					runId: 'run_susp',
					agentId: 'agent-001',
					payload: { toolCallId: 'tc-1', toolName: 'execute_workflow', args: {} },
				},
				at,
			),
			eventRow(
				{
					type: 'confirmation-request',
					runId: 'run_susp',
					agentId: 'agent-001',
					payload: { toolCallId: 'tc-1', requestId: 'req-1', message: 'Run it?' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		const assistant = result.messages[1];
		expect(assistant.agentTree?.toolCalls[0]?.confirmation?.requestId).toBe('req-1');
	});

	it('anchors a group at its parent run so late background completions do not shift pairing', async () => {
		// Turn 1's group has a background run that finishes AFTER turn 2. A
		// stored snapshot's createdAt is stamped at parent-run end and never
		// moves; the fold entry must anchor the same way, or the parser's
		// next-message guard rejects it for turn 1 and the tree becomes a
		// trailing orphan card.
		// Assistant message createdAt is stamped when the response starts, so it
		// precedes the run's final rows; the entry's anchor must land between it
		// and the next user message.
		const t = (seconds: number) => new Date(2026, 0, 1, 0, 0, seconds);
		mockListMessages.mockResolvedValue({
			messages: [
				{ id: 'msg-u1', role: 'user', content: 'first', createdAt: t(0) },
				{
					id: 'msg-a1',
					role: 'assistant',
					content: [{ type: 'text', text: 'answer one' }],
					createdAt: t(8),
				},
				{ id: 'msg-u2', role: 'user', content: 'second', createdAt: t(20) },
				{
					id: 'msg-a2',
					role: 'assistant',
					content: [{ type: 'text', text: 'answer two' }],
					createdAt: t(26),
				},
			],
		});
		mockEventLogRepository.getForThread.mockResolvedValue([
			// Turn 1: parent run answers at ~t10, spawns a background sibling.
			eventRow(
				{
					type: 'run-start',
					runId: 'run_parent',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				t(5),
			),
			eventRow(
				{
					type: 'text-block',
					runId: 'run_parent',
					agentId: 'agent-001',
					payload: { text: 'answer one' },
				},
				t(9),
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_bg',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				t(9),
			),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_parent',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				t(10),
			),
			// Turn 2 completes while the background run is still going.
			eventRow(
				{
					type: 'run-start',
					runId: 'run_2',
					agentId: 'agent-001',
					payload: { messageId: 'm-2' },
				},
				t(25),
			),
			...toolCallRows('run_2', 1).map((row) => ({ ...row, createdAt: t(26) })),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_2',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				t(29),
			),
			// The background sibling finishes LAST, after turn 2.
			eventRow(
				{
					type: 'tool-call',
					runId: 'run_bg',
					agentId: 'agent-001',
					payload: { toolCallId: 'tc-bg', toolName: 'bg-tool', args: {} },
				},
				t(40),
			),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_bg',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				t(41),
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		// Four messages, no trailing orphan card.
		expect(result.messages).toHaveLength(4);
		// Turn 1 pairs with its group's tree (parent text + background tool call).
		const turn1 = result.messages[1];
		expect(turn1.agentTree?.textContent).toBe('answer one');
		expect(turn1.agentTree?.toolCalls.map((tc) => tc.toolName)).toContain('bg-tool');
		// Turn 2 pairs with its own run.
		expect(result.messages[3].agentTree?.toolCalls.map((tc) => tc.toolName)).toEqual(['tool-1']);
	});

	it('keeps interleaved runs of one group in thread order', async () => {
		// Background runs execute concurrently with their parent, so a group's
		// facts interleave in the log. The fold must feed the reducer in seq
		// order — the order the run-sync bootstrap and snapshot writer use —
		// not run-by-run concatenation.
		const block = (runId: string, text: string, responseId: string) =>
			eventRow(
				{ type: 'text-block', runId, agentId: 'agent-001', responseId, payload: { text } },
				at,
			);
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-start',
					runId: 'run_b',
					agentId: 'agent-001',
					payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
				},
				at,
			),
			block('run_a', 'one', 'r-1'),
			block('run_b', 'two', 'r-2'),
			block('run_a', 'three', 'r-3'),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_b',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_a',
					agentId: 'agent-001',
					payload: { status: 'completed' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		const timeline = result.messages[1].agentTree?.timeline ?? [];
		const texts = timeline.map((entry) => ('content' in entry ? entry.content : ''));
		expect(texts).toEqual(['one', 'two', 'three']);
	});

	it('keeps the stored snapshot tree for pre-log threads (no log rows)', async () => {
		const tree = makeTree();
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{ tree, runId: 'run_abc', createdAt: at, updatedAt: at },
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages[1].agentTree).toStrictEqual(tree);
		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
	});

	it('falls back to stored snapshots when the log read fails', async () => {
		const tree = makeTree();
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{ tree, runId: 'run_abc', createdAt: at, updatedAt: at },
		]);
		mockEventLogRepository.getForThread.mockRejectedValue(new Error('db down'));

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages[1].agentTree).toStrictEqual(tree);
	});

	it('falls back to stored snapshots when the log derives nothing renderable', async () => {
		const tree = makeTree();
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{ tree, runId: 'run_abc', createdAt: at, updatedAt: at },
		]);
		// The log holds only lifecycle facts — no renderable work, so no orphan
		// card is derived and the stored snapshots keep rendering.
		mockEventLogRepository.getForThread.mockResolvedValue([
			eventRow(
				{
					type: 'run-start',
					runId: 'run_empty',
					agentId: 'agent-001',
					payload: { messageId: 'm-2' },
				},
				at,
			),
			eventRow(
				{
					type: 'run-finish',
					runId: 'run_empty',
					agentId: 'agent-001',
					payload: { status: 'cancelled' },
				},
				at,
			),
		]);

		const service = createService({ durableLog: true });
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages[1].agentTree).toStrictEqual(tree);
		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
	});

	it('never reads the log when the flag is off', async () => {
		const service = createService();
		await service.getRichMessages('user-1', 'thread-1');

		expect(mockEventLogRepository.getForThread).not.toHaveBeenCalled();
	});
});

describe('InstanceAiMemoryService.ensureThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates a thread bound to the project in a single atomic call', async () => {
		mockGetThread.mockResolvedValueOnce(null);
		mockSaveThreadWithProject.mockResolvedValueOnce({
			id: 'thread-new',
			title: '',
			resourceId: 'user-1',
			metadata: { source: 'assistant_page', origin: 'internal' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-new', 'project-1', {
			source: 'assistant_page',
			origin: 'internal',
		});

		// Thread + project binding are written together, so a partial failure can
		// never persist a project-less thread.
		expect(mockSaveThreadWithProject).toHaveBeenCalledWith(
			{
				id: 'thread-new',
				resourceId: 'user-1',
				title: '',
				metadata: { source: 'assistant_page', origin: 'internal' },
			},
			'project-1',
		);
		expect(mockSaveThread).not.toHaveBeenCalled();
		expect(result.created).toBe(true);
		expect(result.thread.id).toBe('thread-new');
		expect(result.thread.resourceId).toBe('user-1');
	});

	it('returns the existing thread without rewriting it', async () => {
		mockGetThread.mockResolvedValueOnce({
			id: 'thread-existing',
			title: 'Existing',
			resourceId: 'user-1',
			metadata: { foo: 'bar' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-existing', 'project-1', {
			source: 'assistant_page',
			origin: 'internal',
		});

		expect(mockSaveThread).not.toHaveBeenCalled();
		expect(result.created).toBe(false);
		expect(result.thread.title).toBe('Existing');
	});
});

describe('InstanceAiMemoryService.restoreThreadMessages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('preserves message ids and content verbatim, coercing createdAt back to a Date', async () => {
		const service = createService();

		const result = await service.restoreThreadMessages('user-1', 'thread-1', [
			{
				id: 'msg-user',
				type: 'llm',
				role: 'user',
				content: [{ type: 'text', text: 'Send a daily digest to #cosmic-otter-alerts' }],
				createdAt: '2026-01-01T00:00:00.000Z',
			},
			{
				id: 'msg-assistant',
				type: 'llm',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Built it.' },
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						state: 'resolved',
						input: { code: '…' },
						output: { success: true, workflowId: 'wf-1' },
					},
				],
				createdAt: '2026-01-01T00:00:01.000Z',
			},
		]);

		expect(mockSaveMessages).toHaveBeenCalledTimes(1);
		const args = mockSaveMessages.mock.calls[0][0];
		expect(args.threadId).toBe('thread-1');
		expect(args.resourceId).toBe('user-1');
		expect(args.messages).toHaveLength(2);
		// Verbatim restore: same ids and content blocks, createdAt as ascending Dates.
		expect(args.messages[0].id).toBe('msg-user');
		expect(args.messages[1].content[1].toolCallId).toBe('tc-1');
		expect(args.messages[0].createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
		expect(args.messages[1].createdAt).toEqual(new Date('2026-01-01T00:00:01.000Z'));
		expect(result).toEqual({ restored: 2 });
	});

	it('accepts custom messages (no role, data payload)', async () => {
		const service = createService();

		await service.restoreThreadMessages('user-1', 'thread-1', [
			{
				id: 'msg-custom',
				type: 'custom',
				data: { widget: 'setup-card' },
				createdAt: '2026-01-01T00:00:00.000Z',
			},
		]);

		expect(mockSaveMessages.mock.calls[0][0].messages[0].data).toEqual({ widget: 'setup-card' });
	});

	it.each([
		['missing id', { role: 'user', content: [], createdAt: '2026-01-01T00:00:00.000Z' }],
		['unparseable createdAt', { id: 'm', role: 'user', content: [], createdAt: 'not-a-date' }],
		['missing content', { id: 'm', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' }],
		['custom without data', { id: 'm', type: 'custom', createdAt: '2026-01-01T00:00:00.000Z' }],
	])(
		'rejects a structurally invalid message (%s) without writing anything',
		async (_label, bad) => {
			const service = createService();

			await expect(service.restoreThreadMessages('user-1', 'thread-1', [bad])).rejects.toThrow(
				'Seed message at index 0',
			);
			expect(mockSaveMessages).not.toHaveBeenCalled();
		},
	);
});

describe('InstanceAiMemoryService.deleteThread', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes hidden sub-agent threads before deleting the parent thread', async () => {
		const service = createService();

		await service.deleteThread('00000000-0000-4000-8000-000000000001');

		expect(mockDeleteThreadsByResourceIdPrefix).toHaveBeenCalledWith(
			'instance-ai-subagent:00000000-0000-4000-8000-000000000001:',
		);
		expect(mockDeleteThread).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
		expect(mockDeleteThreadsByResourceIdPrefix.mock.invocationCallOrder[0]).toBeLessThan(
			mockDeleteThread.mock.invocationCallOrder[0],
		);
	});
});

describe('InstanceAiMemoryService.ensureThread launch metadata', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('writes source/origin/sourceContext into metadata when creating', async () => {
		mockGetThread.mockResolvedValueOnce(null);
		mockSaveThreadWithProject.mockResolvedValueOnce({
			id: 'thread-1',
			title: '',
			resourceId: 'user-1',
			metadata: {
				source: 'template-view',
				origin: 'internal',
				sourceContext: { templateId: '42' },
			},
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-1', 'project-1', {
			source: 'template-view',
			origin: 'internal',
			sourceContext: { templateId: '42' },
		});

		expect(mockSaveThreadWithProject).toHaveBeenCalledWith(
			{
				id: 'thread-1',
				resourceId: 'user-1',
				title: '',
				metadata: {
					source: 'template-view',
					origin: 'internal',
					sourceContext: { templateId: '42' },
				},
			},
			'project-1',
		);
		expect(result.created).toBe(true);
	});

	it('omits sourceContext from metadata when not provided', async () => {
		mockGetThread.mockResolvedValueOnce(null);
		mockSaveThreadWithProject.mockResolvedValueOnce({
			id: 'thread-2',
			title: '',
			resourceId: 'user-1',
			metadata: { source: 'website-template', origin: 'external' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const service = createService();
		await service.ensureThread('user-1', 'thread-2', 'project-1', {
			source: 'website-template',
			origin: 'external',
		});

		expect(mockSaveThreadWithProject).toHaveBeenCalledWith(
			{
				id: 'thread-2',
				resourceId: 'user-1',
				title: '',
				metadata: {
					source: 'website-template',
					origin: 'external',
				},
			},
			'project-1',
		);
	});

	it('does not pass metadata when the thread already exists', async () => {
		mockGetThread.mockResolvedValueOnce({
			id: 'thread-existing',
			title: 'Existing',
			resourceId: 'user-1',
			metadata: { foo: 'bar' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-existing', 'project-1', {
			source: 'template-view',
			origin: 'internal',
			sourceContext: { templateId: '42' },
		});

		expect(result.created).toBe(false);
		expect(mockSaveThreadWithProject).not.toHaveBeenCalled();
	});
});

describe('InstanceAiMemoryService.deleteThreadsForUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to the agent memory and returns the number of deleted threads', async () => {
		mockDeleteThreadsByResourceId.mockResolvedValueOnce(3);
		const service = createService();

		const deleted = await service.deleteThreadsForUser('user-1');

		expect(deleted).toBe(3);
		expect(mockDeleteThreadsByResourceId).toHaveBeenCalledWith('user-1');
	});
});

describe('InstanceAiMemoryService.cleanupExpiredThreads', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('queries oldest threads first so fresh threads do not hide expired ones', async () => {
		const dateNow = vi
			.spyOn(Date, 'now')
			.mockReturnValue(new Date('2026-05-15T00:00:00.000Z').getTime());
		const expiredThread = makeThread('expired-thread', '2026-05-01T00:00:00.000Z');
		const freshThread = makeThread('fresh-thread', '2026-05-14T00:00:00.000Z');
		let expiredDeleted = false;

		mockListThreads.mockImplementation(
			async (args: { orderBy?: { direction?: 'ASC' | 'DESC' } }) => {
				if (args.orderBy?.direction === 'ASC') {
					return expiredDeleted
						? { threads: [freshThread], total: 1, page: 0, hasMore: false }
						: { threads: [expiredThread], total: 2, page: 0, hasMore: true };
				}

				return {
					threads: [freshThread],
					total: 2,
					page: 0,
					hasMore: true,
				};
			},
		);
		mockDeleteThread.mockImplementation(async (threadId: string) => {
			if (threadId === expiredThread.id) expiredDeleted = true;
		});

		const service = createService({ threadTtlDays: 7 });
		const deletedCount = await service.cleanupExpiredThreads();

		expect(deletedCount).toBe(1);
		expect(mockListThreads).toHaveBeenCalledWith({
			perPage: 100,
			page: 0,
			orderBy: { field: 'updatedAt', direction: 'ASC' },
		});
		expect(mockDeleteThread).toHaveBeenCalledWith(expiredThread.id);
		expect(mockDeleteThread).not.toHaveBeenCalledWith(freshThread.id);

		dateNow.mockRestore();
	});
});
