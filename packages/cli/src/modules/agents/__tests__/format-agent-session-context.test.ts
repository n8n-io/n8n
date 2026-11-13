import type {
	AgentSessionThread,
	AgentSessionTurn,
} from '@/modules/agents/agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];
import {
	formatPreviewSessionContext,
	formatPreviewSessionContextPage,
	PREVIEW_CONTEXT_CLOSE_TAG,
	PREVIEW_CONTEXT_OPEN_TAG,
} from '../format-agent-session-context';

function makeThread(overrides: Partial<AgentSessionThread> = {}): AgentSessionThread {
	return {
		id: 'thread-1',
		title: 'Support triage test',
		sessionNumber: 3,
		...overrides,
	} as AgentSessionThread;
}

function makeExecution(overrides: Partial<AgentSessionTurn> = {}): AgentSessionTurn {
	return {
		id: 'exec-1',
		status: 'success',
		userMessage: 'Hello agent',
		model: 'gpt-test',
		duration: 1200,
		totalTokens: 42,
		error: null,
		timeline: [],
		...overrides,
	} as AgentSessionTurn;
}

function toolCallEvent(overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {}) {
	return {
		type: 'tool-call' as const,
		kind: 'tool' as const,
		name: 'search_orders',
		toolCallId: 'tc-1',
		input: { query: 'open orders' },
		output: { count: 2 },
		startTime: 1000,
		endTime: 1500,
		success: true,
		...overrides,
	};
}

describe('formatPreviewSessionContext', () => {
	it('formats the background signal as an event instead of a tool call', () => {
		const block = formatPreviewSessionContext(makeThread(), [
			makeExecution({
				userMessage: null,
				timeline: [
					{
						type: 'background-task-signal',
						timestamp: 100,
						signal: {
							tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
						},
					},
				],
			}),
		]);
		expect(block).toContain('Background task results received:');
		expect(block).toContain('Research');
		expect(block).not.toContain('Tool call:');
	});

	it('formats a whole session with user messages, tool calls, and delimiter tags', () => {
		const executions = [
			makeExecution({
				id: 'exec-1',
				userMessage: 'First question',
				inputMessages: [
					{
						id: 'initial-input',
						role: 'user',
						content: [{ type: 'text', text: 'First question' }],
					},
					{
						id: 'steered-input',
						role: 'user',
						content: [
							{ type: 'file', fileId: 'file-1', fileName: 'orders.csv', mimeType: 'text/csv' },
						],
					},
				],
				timeline: [
					{ type: 'reasoning', content: 'I should search the orders.', timestamp: 0, endTime: 1 },
					toolCallEvent(),
					{ type: 'text', content: 'Here are your orders.', timestamp: 1, endTime: 2 },
					{
						type: 'input',
						timestamp: 3,
						messageId: 'steered-input',
					},
				],
			}),
			makeExecution({ id: 'exec-2', userMessage: 'Second question' }),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).not.toBeNull();
		expect(block!.startsWith(PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(block!.endsWith(PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(block).toContain('Support triage test');
		expect(block).toContain('scope: whole session, turns: 2');
		expect(block).toContain('User: First question');
		expect(block).toContain('User: Second question');
		expect(block).toContain('Reasoning: I should search the orders.');
		expect(block).toContain('Tool call: search_orders | kind=tool | succeeded | 500ms');
		expect(block).toContain('Input: {"query":"open orders"}');
		expect(block).toContain('Output: {"count":2}');
		expect(block).toContain('Assistant: Here are your orders.');
		expect(block!.match(/User: First question/g)).toHaveLength(1);
		expect(block!.match(/User: \[Attachment: orders\.csv\]/g)).toHaveLength(1);
		expect(block!.indexOf('User: [Attachment: orders.csv]')).toBeGreaterThan(
			block!.indexOf('Assistant: Here are your orders.'),
		);
	});

	it('scopes a single turn to the anchor plus trailing resume continuations', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'Turn one' }),
			makeExecution({ id: 'exec-2', userMessage: null }),
			makeExecution({ id: 'exec-3', userMessage: 'Turn two' }),
		];

		const block = formatPreviewSessionContext(makeThread(), executions, 'exec-1');

		expect(block).toContain('scope: single turn, turns: 2');
		expect(block).toContain('User: Turn one');
		expect(block).not.toContain('Turn two');
	});

	it('groups shared input references and stops at a hidden input with its own ID', () => {
		const executions = [
			makeExecution({ id: 'start', userMessage: 'Question', inputMessageIds: ['input-1'] }),
			makeExecution({
				id: 'resume',
				userMessage: null,
				inputMessageIds: ['input-1'],
				timeline: [{ type: 'text', content: 'Approved answer', timestamp: 1 }],
			}),
			makeExecution({
				id: 'wake',
				userMessage: null,
				inputMessageIds: ['hidden-input'],
				timeline: [{ type: 'text', content: 'Background result', timestamp: 2 }],
			}),
		];
		const block = formatPreviewSessionContext(makeThread(), executions, 'resume');
		expect(block).toContain('scope: single turn, turns: 2');
		expect(block).toContain('User: Question');
		expect(block).toContain('Approved answer');
		expect(block).not.toContain('Background result');
	});

	it('walks back from a resumed HITL execution to include the user message and pre-suspension events', () => {
		const executions = [
			makeExecution({
				id: 'exec-1',
				userMessage: 'Turn one',
				timeline: [
					{ type: 'text', content: 'Before suspension.', timestamp: 1, endTime: 2 },
					{ type: 'suspension', toolName: 'ask_question', toolCallId: 'tc-1', timestamp: 3 },
				],
			}),
			makeExecution({
				id: 'exec-2',
				userMessage: null,
				timeline: [
					{
						type: 'hitl-response',
						toolCallId: 'tc-1',
						response: { approved: true },
						timestamp: 4,
					},
					{ type: 'text', content: 'After resume.', timestamp: 4, endTime: 5 },
				],
			}),
			makeExecution({ id: 'exec-3', userMessage: 'Turn two' }),
		];

		const block = formatPreviewSessionContext(makeThread(), executions, 'exec-2');

		expect(block).toContain('scope: single turn, turns: 2');
		expect(block).toContain('User: Turn one');
		expect(block).toContain('Before suspension.');
		expect(block).toContain('[suspended waiting on ask_question]');
		expect(block).toContain('Human response: {"approved":true}');
		expect(block).toContain('After resume.');
		expect(block).not.toContain('Turn two');
	});

	it('returns null for an unknown executionId', () => {
		expect(formatPreviewSessionContext(makeThread(), [makeExecution()], 'missing')).toBeNull();
	});

	it('truncates oversized tool outputs', () => {
		const executions = [
			makeExecution({
				timeline: [toolCallEvent({ output: { blob: 'x'.repeat(5_000) } })],
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('… [truncated]');
		expect(block).not.toContain('x'.repeat(3_000));
	});

	it('renders host events with their name and truncated payload', () => {
		const executions = [
			makeExecution({
				timeline: [
					{ type: 'host-event', name: 'test.notice', payload: { level: 'info' }, timestamp: 5 },
					{
						type: 'host-event',
						name: 'test.blob',
						payload: { blob: 'x'.repeat(5_000) },
						timestamp: 6,
					},
				],
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('Host event test.notice: {"level":"info"}');
		expect(block).toContain('Host event test.blob:');
		expect(block).not.toContain('x'.repeat(3_000));
	});

	it('renders suspension events and execution errors', () => {
		const executions = [
			makeExecution({
				status: 'error',
				error: 'boom',
				timeline: [
					{ type: 'suspension', toolName: 'ask_question', toolCallId: 'tc-9', timestamp: 5 },
				],
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('[suspended waiting on ask_question]');
		expect(block).toContain('error=boom');
	});

	it('renders a guardrail stop with its code instead of a tool call', () => {
		const block = formatPreviewSessionContext(makeThread(), [
			makeExecution({
				timeline: [toolCallEvent(), { type: 'guardrail', code: 'budget.session', timestamp: 2000 }],
			}),
		]);

		expect(block).toContain('[stopped by guardrail budget.session]');
		expect(block).toContain('Tool call: search_orders');
		expect(block?.match(/Tool call:/g)).toHaveLength(1);
	});

	it('omits turns beyond the whole-block cap and reports the omission', () => {
		const bigText = 'y'.repeat(3_900);
		const executions = Array.from({ length: 40 }, (_, i) =>
			makeExecution({
				id: `exec-${i}`,
				userMessage: `${bigText}-${i}`,
			}),
		);

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toMatch(/\[transcript truncated: \d+ earlier turns omitted\]/);
		expect(block!.length).toBeLessThanOrEqual(100_000);
		expect(block).toContain(`${bigText}-39`);
		expect(block).not.toContain(`${bigText}-0`);
	});

	it('truncates an oversized single turn to the remaining budget instead of dropping it', () => {
		const executions = [
			makeExecution({
				timeline: Array.from({ length: 5_000 }, (_, i) => ({
					type: 'suspension' as const,
					toolName: `ask_question_${i}`,
					toolCallId: `tc-${i}`,
					timestamp: i,
				})),
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('## Turn');
		expect(block).toContain('[suspended waiting on ask_question_0]');
		expect(block!.length).toBeLessThanOrEqual(100_000);
	});
});

describe('formatPreviewSessionContextPage', () => {
	const UNLIMITED = Number.MAX_SAFE_INTEGER;

	function readAllPages(
		executions: AgentSessionTurn[],
		options: { executionId?: string; maxToolValueLength?: number; pageSize: number },
	) {
		const pages: string[] = [];
		let cursor: string | undefined;
		do {
			const page = formatPreviewSessionContextPage(makeThread(), executions, {
				...options,
				cursor,
			});
			if (!page.ok) throw new Error(page.reason);
			pages.push(page.transcript);
			cursor = page.nextCursor ?? undefined;
		} while (cursor !== undefined);
		return pages;
	}

	function onePage(executions: AgentSessionTurn[], maxToolValueLength = UNLIMITED) {
		const page = formatPreviewSessionContextPage(makeThread(), executions, {
			maxToolValueLength,
			pageSize: Number.POSITIVE_INFINITY,
		});
		if (!page.ok || page.nextCursor !== null) throw new Error('expected one page');
		return page.transcript;
	}

	it('returns complete text and cuts tool values at maxToolValueLength', () => {
		const assistantText = 'a'.repeat(10_000);
		const transcript = onePage(
			[
				makeExecution({
					userMessage: 'u'.repeat(10_000),
					timeline: [
						{ type: 'reasoning', content: 'r'.repeat(10_000), timestamp: 0, endTime: 1 },
						toolCallEvent({ input: { query: 'i'.repeat(500) }, output: 'o'.repeat(500) }),
						{ type: 'text', content: assistantText, timestamp: 1, endTime: 2 },
					],
				}),
			],
			100,
		);

		expect(transcript.startsWith(PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(transcript.endsWith(PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(transcript).toContain(`User: ${'u'.repeat(10_000)}\n`);
		expect(transcript).toContain(`Reasoning: ${'r'.repeat(10_000)}\n`);
		expect(transcript).toContain(`Assistant: ${assistantText}\n`);
		expect(transcript).toContain(`  Input: {"query":"${'i'.repeat(90)}… [truncated]\n`);
		expect(transcript).toContain(`  Output: "${'o'.repeat(99)}… [truncated]\n`);
	});

	it('leaves out tool inputs and outputs when maxToolValueLength is 0', () => {
		const transcript = onePage([makeExecution({ timeline: [toolCallEvent()] })], 0);

		expect(transcript).toContain('Tool call: search_orders | kind=tool | succeeded | 500ms\n');
		expect(transcript).not.toContain('Input:');
		expect(transcript).not.toContain('Output:');
	});

	it('returns every turn of a long session in pages that end before a turn', () => {
		const executions = Array.from({ length: 40 }, (_, i) =>
			makeExecution({ id: `exec-${i}`, userMessage: `${'y'.repeat(3_900)}-${i}` }),
		);

		const pages = readAllPages(executions, { pageSize: 10_000 });

		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) expect(page.length).toBeLessThanOrEqual(10_000);
		for (const page of pages.slice(1)) expect(page.startsWith('\n## Turn (')).toBe(true);
		expect(pages.join('')).toBe(onePage(executions));
		expect(pages.join('').match(/## Turn/g)).toHaveLength(40);
	});

	it('splits a value that is larger than one page', () => {
		const executions = [
			makeExecution({ timeline: [toolCallEvent({ output: 'z'.repeat(25_000) })] }),
		];

		const pages = readAllPages(executions, { maxToolValueLength: UNLIMITED, pageSize: 10_000 });

		expect(pages.length).toBeGreaterThanOrEqual(3);
		expect(pages[0]).toHaveLength(10_000);
		expect(pages.join('')).toBe(onePage(executions));
	});

	it('does not split a surrogate pair at a page end', () => {
		const executions = [makeExecution({ userMessage: '😀'.repeat(200) })];

		const pages = readAllPages(executions, { pageSize: 101 });

		expect(pages.join('')).toBe(onePage(executions));
		for (const page of pages) expect(page).not.toMatch(/[\uD800-\uDBFF]$/);
	});

	it('scopes the pages to the selected turn and its resumed parts', () => {
		const executions = [
			makeExecution({ id: 'exec-0', userMessage: 'Earlier turn' }),
			makeExecution({
				id: 'exec-1',
				userMessage: 'Turn one',
				timeline: [
					{ type: 'suspension', toolName: 'ask_question', toolCallId: 'tc-1', timestamp: 3 },
				],
			}),
			makeExecution({
				id: 'exec-2',
				userMessage: null,
				timeline: [{ type: 'text', content: 'r'.repeat(12_000), timestamp: 4, endTime: 5 }],
			}),
			makeExecution({ id: 'exec-3', userMessage: 'Turn two' }),
		];

		const transcript = readAllPages(executions, { executionId: 'exec-2', pageSize: 5_000 }).join(
			'',
		);

		expect(transcript).toContain('scope: single turn, turns: 2');
		expect(transcript).toContain('User: Turn one');
		expect(transcript).toContain(`Assistant: ${'r'.repeat(12_000)}`);
		expect(transcript).not.toContain('Earlier turn');
		expect(transcript).not.toContain('Turn two');
	});

	it('rejects a cursor when the transcript before it changed', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'a'.repeat(300) }),
			makeExecution({ id: 'exec-2', userMessage: 'b'.repeat(300) }),
		];
		const first = formatPreviewSessionContextPage(makeThread(), executions, { pageSize: 700 });
		if (!first.ok || first.nextCursor === null) throw new Error('expected a next page');
		expect(first.transcript).toContain('a'.repeat(300));
		const cursor = first.nextCursor;

		const changed = [makeExecution({ ...executions[0], status: 'error' }), executions[1]];

		expect(formatPreviewSessionContextPage(makeThread(), executions, { cursor })).toMatchObject({
			ok: true,
		});
		expect(formatPreviewSessionContextPage(makeThread(), changed, { cursor })).toEqual({
			ok: false,
			reason: 'invalid_cursor',
		});
		expect(
			formatPreviewSessionContextPage(makeThread(), executions, { cursor, executionId: 'exec-2' }),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
		expect(
			formatPreviewSessionContextPage(makeThread(), executions, { cursor: 'not-a-cursor' }),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
	});

	it('reports an unknown executionId', () => {
		expect(
			formatPreviewSessionContextPage(makeThread(), [makeExecution()], { executionId: 'missing' }),
		).toEqual({ ok: false, reason: 'execution_not_found' });
	});
});
