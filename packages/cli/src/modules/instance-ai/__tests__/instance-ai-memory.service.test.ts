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
const mockCheckpointRepository = { findActiveByThreadId: vi.fn().mockResolvedValue([]) };

interface LogRow {
	runId: string;
	createdAt: Date;
	event: { runId: string; [key: string]: unknown };
}

/** Facts the log double serves. Tests describe the thread once with
 *  `setLogRows`; the windowed queries the service issues are derived from that
 *  list, so a windowing change shows up as a change in what folds. */
let logRows: LogRow[] = [];

function setLogRows(rows: LogRow[]): void {
	logRows = rows;
}

const mockEventLogRepository = {
	getRunStarts: vi.fn(),
	findRunIdsInWindow: vi.fn(),
	getForThreadRuns: vi.fn(),
};

/** Re-arms the derived implementations — a test that overrides one (e.g. to
 *  reject) must not leak that into the next. */
function installLogDouble(rows: LogRow[] = []): void {
	setLogRows(rows);
	mockEventLogRepository.getRunStarts.mockImplementation(async () =>
		logRows
			.filter((row) => row.event.type === 'run-start')
			.map((row) => {
				const payload = row.event.payload as { messageGroupId?: string } | undefined;
				const groupId = payload?.messageGroupId;
				return {
					runId: row.runId,
					messageGroupId: typeof groupId === 'string' ? groupId : undefined,
				};
			}),
	);
	mockEventLogRepository.findRunIdsInWindow.mockImplementation(
		async (_threadId: string, window: { since?: Date; before?: Date }) => [
			...new Set(
				logRows
					.filter((row) => !window.since || row.createdAt >= window.since)
					.filter((row) => !window.before || row.createdAt < window.before)
					.map((row) => row.runId),
			),
		],
	);
	mockEventLogRepository.getForThreadRuns.mockImplementation(
		async (_threadId: string, runIds: string[]) =>
			logRows.filter((row) => runIds.includes(row.runId)),
	);
}
const mockDurableLogMetrics = { recordFoldRead: vi.fn() };

function createService(options: { threadTtlDays?: number } = {}): InstanceAiMemoryService {
	const mockConfig = {
		instanceAi: {
			threadTtlDays: options.threadTtlDays ?? 0,
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
		mockCheckpointRepository as never,
		mockPendingConfirmationRepository as never,
		mockEventLogRepository as never,
		mockDurableLogMetrics as never,
	);
}

const mockPendingConfirmationRepository = {
	findLiveRequestIds: vi.fn(async () => new Set<string>()),
};

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
		installLogDouble();
		mockListMessages.mockResolvedValue({ messages: [] });
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
		installLogDouble();
		mockListMessages.mockResolvedValue({ messages: [userMessage, assistantMessage] });
	});

	it('derives the agent tree for a completed run from the log', async () => {
		setLogRows([
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

		const service = createService();
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
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
		});

		// Only run_done's entry is derived; no partial 'mg-2' entry exists.
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
		expect(result.messages[1].agentTree?.toolCalls).toHaveLength(1);
	});

	it('renders nothing for a fold emptied by exclusion', async () => {
		// The in-flight group is the thread's ONLY log content. Excluding run_b
		// poisons the whole group, so its completed sibling run_a must not derive
		// a partial tree — the in-flight turn renders live via SSE, not history.
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
		});

		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('excludes a group via live group ids when the excluded run has no persisted rows yet', async () => {
		// The active run_b just started: its run-start is still in the drain
		// queue, so the log alone cannot map it to 'mg-1'. The controller passes
		// the live group id, and the completed sibling run_a must not derive a
		// partial group entry.
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1', {
			excludeRunIds: ['run_b'],
			excludeMessageGroupIds: ['mg-1'],
		});

		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('excludes an in-flight group when the caller passes no exclusions (multi-main sibling read)', async () => {
		// On a main that is not driving the run the controller's per-process run
		// state is empty, so no excludeRunIds arrive. The log alone must identify
		// the in-flight group: its run has a run-start but no terminal run-finish.
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		// Only run_done's entry is derived, exactly as the driving main would.
		expect(mockDurableLogMetrics.recordFoldRead).toHaveBeenCalledWith(expect.any(Number), 1);
		expect(result.messages[1].agentTree?.toolCalls).toHaveLength(1);
	});

	it('renders nothing when the only group is in flight on another main', async () => {
		mockListMessages.mockResolvedValue({ messages: [userMessage] });
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe('user');
	});

	it('keeps folding a HITL-suspended run without a run-finish', async () => {
		// A suspended run legitimately never wrote its run-finish, but its turn
		// must keep rendering: with no assistant rows committed yet, the folded
		// entry surfaces as a standalone assistant message carrying the
		// confirmation card. The suspension is recognized by the run's own
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
				state: { status: 'suspended' },
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				updatedAt: new Date('2026-01-01T00:00:01.000Z'),
			},
		]);
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		const assistant = result.messages[1];
		expect(assistant.role).toBe('assistant');
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
		setLogRows([
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

		const service = createService();
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
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		const timeline = result.messages[1].agentTree?.timeline ?? [];
		const texts = timeline.map((entry) => ('content' in entry ? entry.content : ''));
		expect(texts).toEqual(['one', 'two', 'three']);
	});

	it('renders messages without trees for pre-log threads (no log rows)', async () => {
		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		// No run-start facts -> nothing folds; the assistant message renders from
		// its own content blocks only (no fold-provided runIds).
		expect(result.messages).toHaveLength(2);
		expect(result.messages[1].runIds).toBeUndefined();
		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
	});

	it('renders messages without trees when the log read fails', async () => {
		mockEventLogRepository.getRunStarts.mockRejectedValue(new Error('db down'));

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		// Degrades to messages-without-trees rather than failing the page read.
		expect(result.messages).toHaveLength(2);
		expect(result.messages[1].runIds).toBeUndefined();
		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
	});

	it('renders messages without trees when the log derives nothing renderable', async () => {
		// The log holds only lifecycle facts — no renderable work, so no orphan
		// card is derived.
		setLogRows([
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

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		expect(result.messages[1].runIds).toBeUndefined();
		expect(mockDurableLogMetrics.recordFoldRead).not.toHaveBeenCalled();
	});

	describe('hydration is scoped to the requested page', () => {
		const oldAt = new Date('2025-06-01T00:00:00.000Z');

		/** A complete, renderable run: start, one tool call, finish. */
		function runRows(runId: string, when: Date, messageGroupId?: string) {
			return [
				eventRow(
					{
						type: 'run-start',
						runId,
						agentId: 'agent-001',
						payload: { messageId: `m-${runId}`, ...(messageGroupId ? { messageGroupId } : {}) },
					},
					when,
				),
				eventRow(
					{
						type: 'tool-call',
						runId,
						agentId: 'agent-001',
						payload: { toolCallId: `tc-${runId}`, toolName: `tool-${runId}`, args: {} },
					},
					when,
				),
				eventRow(
					{
						type: 'tool-result',
						runId,
						agentId: 'agent-001',
						payload: { toolCallId: `tc-${runId}`, result: {} },
					},
					when,
				),
				eventRow(
					{
						type: 'run-finish',
						runId,
						agentId: 'agent-001',
						payload: { status: 'completed' },
					},
					when,
				),
			];
		}

		it('folds only the runs behind the page, and keeps older turns off it', async () => {
			// A long thread: one turn from months ago, one in the returned page.
			// The old run's facts must neither be read nor rendered — before
			// windowing its derived tree had no message to pair with and the
			// parser surfaced it as a message of its own.
			setLogRows([...runRows('run_old', oldAt), ...runRows('run_recent', at)]);

			const service = createService();
			const result = await service.getRichMessages('user-1', 'thread-1');

			expect(mockEventLogRepository.getForThreadRuns).toHaveBeenCalledWith('thread-1', [
				'run_recent',
			]);
			expect(result.messages).toHaveLength(2);
			expect(result.messages[1].runId).toBe('run_recent');
			expect(result.messages[1].agentTree?.toolCalls.map((tc) => tc.toolName)).toEqual([
				'tool-run_recent',
			]);
		});

		it('leaves the upper bound open on the newest page so an in-flight run still folds', async () => {
			// A run whose turn has not committed yet has facts newer than every
			// persisted message row. Clipping at the page's newest message would
			// hide the turn the user is watching.
			const laterAt = new Date('2026-01-01T00:00:09.000Z');
			setLogRows([...runRows('run_recent', at), ...runRows('run_live', laterAt)]);

			const service = createService();
			const result = await service.getRichMessages('user-1', 'thread-1');

			expect(mockEventLogRepository.findRunIdsInWindow).toHaveBeenCalledWith('thread-1', {
				since: userMessage.createdAt,
			});
			expect(mockEventLogRepository.getForThreadRuns).toHaveBeenCalledWith('thread-1', [
				'run_recent',
				'run_live',
			]);
			expect(result.messages.some((m) => m.runId === 'run_live')).toBe(true);
		});

		it('stops an older page where the next page starts, not at its own newest message', async () => {
			// A turn's tree is written when its run ends — after the assistant row
			// it pairs with. Clipping at the page's own newest message would drop
			// the tree of the turn the page ends on, and no other page would claim
			// it either.
			const nextPageAt = new Date('2026-01-01T00:00:05.000Z');
			mockListMessages.mockResolvedValue({
				messages: [userMessage, assistantMessage],
				newerBoundaryAt: nextPageAt,
			});
			setLogRows([...runRows('run_recent', at)]);

			const service = createService();
			await service.getRichMessages('user-1', 'thread-1', { page: 1 });

			expect(mockListMessages).toHaveBeenCalledWith(
				expect.objectContaining({ page: 1, withNewerBoundary: true }),
			);
			expect(mockEventLogRepository.findRunIdsInWindow).toHaveBeenCalledWith('thread-1', {
				since: userMessage.createdAt,
				before: nextPageAt,
			});
		});

		it('hydrates nothing for an out-of-range older page', async () => {
			// No message rows to pair a tree with, and no bounds to read one
			// with: an unbounded read here would hydrate the whole thread to
			// render nothing.
			mockListMessages.mockResolvedValue({ messages: [] });
			setLogRows([...runRows('run_recent', at)]);

			const service = createService();
			const result = await service.getRichMessages('user-1', 'thread-1', { page: 3 });

			expect(mockEventLogRepository.findRunIdsInWindow).not.toHaveBeenCalled();
			expect(result.messages).toEqual([]);
		});

		it('widens the window to whole message groups', async () => {
			// A background run of the same group finishes after the page's last
			// message. Folding the group without it would drop its work from the
			// turn's tree, so the window has to pull the sibling back in.
			const afterPage = new Date('2026-01-01T00:00:30.000Z');
			mockListMessages.mockResolvedValue({
				messages: [userMessage, assistantMessage],
				newerBoundaryAt: new Date('2026-01-01T00:00:05.000Z'),
			});
			setLogRows([...runRows('run_parent', at, 'mg-1'), ...runRows('run_bg', afterPage, 'mg-1')]);

			const service = createService();
			const result = await service.getRichMessages('user-1', 'thread-1', { page: 1 });

			// `run_bg` is outside the page bounds; it rides in on its group.
			expect(mockEventLogRepository.getForThreadRuns).toHaveBeenCalledWith('thread-1', [
				'run_parent',
				'run_bg',
			]);
			const toolNames = result.messages[1].agentTree?.toolCalls.map((tc) => tc.toolName) ?? [];
			expect(toolNames).toContain('tool-run_parent');
			expect(toolNames).toContain('tool-run_bg');
		});

		it('reads unbounded for a page with no message rows', async () => {
			// A thread whose only activity is a first, still-running turn has no
			// message rows yet and must still render.
			mockListMessages.mockResolvedValue({ messages: [] });
			setLogRows([...runRows('run_live', at)]);

			const service = createService();
			const result = await service.getRichMessages('user-1', 'thread-1');

			expect(mockEventLogRepository.findRunIdsInWindow).toHaveBeenCalledWith('thread-1', {});
			expect(result.messages).toHaveLength(1);
			expect(result.messages[0].runId).toBe('run_live');
		});

		it('reads unbounded above on the newest page', async () => {
			// Page 0 has no newer neighbour, so nothing clips the in-flight turn.
			mockListMessages.mockResolvedValue({ messages: [userMessage, assistantMessage] });
			setLogRows([...runRows('run_recent', at)]);

			const service = createService();
			await service.getRichMessages('user-1', 'thread-1');

			expect(mockEventLogRepository.findRunIdsInWindow).toHaveBeenCalledWith('thread-1', {
				since: userMessage.createdAt,
			});
		});
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

describe('bindAgentBuilderTarget', () => {
	const target = { agentId: 'aBcDeFgHiJkLmNoP', projectId: 'project-1', name: 'Support Triage' };

	function seedThread(metadata: Record<string, unknown>, resourceId = 'user-1') {
		mockGetThread.mockResolvedValue({
			id: 'thread-1',
			title: 'Chat',
			resourceId,
			metadata,
			createdAt: new Date('2026-08-20T00:00:00.000Z'),
			updatedAt: new Date('2026-08-20T00:00:00.000Z'),
		});
		mockSaveThread.mockImplementation(async (thread: unknown) => thread);
	}

	beforeEach(() => {
		mockGetThread.mockReset();
		mockSaveThread.mockReset();
	});

	// A merge-style update cannot delete a key, and a thread carrying both makes a
	// reload show a phantom blank artifact next to the real agent.
	it('replaces the pending marker with the bound target in one write', async () => {
		seedThread({
			instanceAiPendingAgentTarget: { agentId: target.agentId, projectId: target.projectId },
			creditsUsed: 2,
		});

		const thread = await createService().bindAgentBuilderTarget('user-1', 'thread-1', target);

		expect(mockSaveThread).toHaveBeenCalledTimes(1);
		expect(thread.metadata?.instanceAiPendingAgentTarget).toBeUndefined();
		expect(thread.metadata?.instanceAiAgentBuilderTarget).toEqual(target);
		expect(thread.metadata?.creditsUsed).toBe(2);
	});

	it('refuses a thread owned by someone else instead of reporting success', async () => {
		seedThread({}, 'someone-else');

		await expect(
			createService().bindAgentBuilderTarget('user-1', 'thread-1', target),
		).rejects.toThrow('Not authorized for this thread');
		expect(mockSaveThread).not.toHaveBeenCalled();
	});

	it('reports a missing thread', async () => {
		mockGetThread.mockResolvedValue(null);

		await expect(
			createService().bindAgentBuilderTarget('user-1', 'thread-1', target),
		).rejects.toThrow('Thread thread-1 not found');
	});
});
