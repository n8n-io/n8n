import type {
	AgentSessionThread,
	AgentSessionTurn,
} from '@/modules/agents/agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];
import {
	formatFullSessionContextPage,
	formatPreviewSessionContext,
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

describe('formatFullSessionContextPage', () => {
	type Page = Extract<ReturnType<typeof formatFullSessionContextPage>, { ok: true }>;

	function readAllPages(
		executions: AgentSessionTurn[],
		options: { executionId?: string; maxChars?: number } = {},
	): Page[] {
		const pages: Page[] = [];
		const seenCursors = new Set<string>();
		let cursor: string | undefined;
		do {
			const page = formatFullSessionContextPage(makeThread(), executions, { ...options, cursor });
			if (!page.ok) throw new Error(page.reason);
			pages.push(page);
			cursor = page.nextCursor ?? undefined;
			if (cursor !== undefined) {
				if (seenCursors.has(cursor)) throw new Error('Cursor repeated');
				seenCursors.add(cursor);
			}
		} while (cursor !== undefined && pages.length < 1_000);
		expect(cursor).toBeUndefined();
		return pages;
	}

	const joined = (pages: Page[]) => pages.map(({ transcript }) => transcript).join('');

	it('returns a short session on one page with the same layout as the compact transcript', () => {
		const executions = [makeExecution({ timeline: [toolCallEvent()] })];

		const page = formatFullSessionContextPage(makeThread(), executions);

		expect(page).toEqual({
			ok: true,
			transcript: formatPreviewSessionContext(makeThread(), executions),
			nextCursor: null,
		});
	});

	it('keeps long user, assistant, and reasoning text complete', () => {
		const userText = `${'u'.repeat(10_000)}-end`;
		const assistantText = `${'a'.repeat(10_000)}-end`;
		const reasoningText = `${'r'.repeat(10_000)}-end`;
		const executions = [
			makeExecution({
				userMessage: userText,
				timeline: [
					{ type: 'reasoning', content: reasoningText, timestamp: 0, endTime: 1 },
					{ type: 'text', content: assistantText, timestamp: 1, endTime: 2 },
				],
			}),
		];

		const transcript = joined(readAllPages(executions));

		expect(transcript).toContain(`User: ${userText}`);
		expect(transcript).toContain(`Reasoning: ${reasoningText}`);
		expect(transcript).toContain(`Assistant: ${assistantText}`);
		expect(transcript).not.toContain('… [truncated]');
	});

	it('keeps long tool values complete and splits a value larger than one page', () => {
		const blob = `${'x'.repeat(250_000)}-end`;
		const executions = [
			makeExecution({ timeline: [toolCallEvent({ input: { query: blob }, output: { blob } })] }),
		];

		const pages = readAllPages(executions);

		expect(pages.length).toBeGreaterThanOrEqual(5);
		for (const page of pages) expect(page.transcript.length).toBeLessThanOrEqual(100_000);
		expect(pages.at(-1)!.nextCursor).toBeNull();
		for (const page of pages.slice(0, -1)) expect(page.nextCursor).toEqual(expect.any(String));
		const transcript = joined(pages);
		expect(transcript.startsWith(PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(transcript.endsWith(PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(transcript).toContain(`  Input: ${JSON.stringify({ query: blob })}`);
		expect(transcript).toContain(`  Output: ${JSON.stringify({ blob })}`);
		expect(transcript).not.toContain('… [truncated]');
	});

	it('keeps every turn of a long session in order', () => {
		const bigText = 'y'.repeat(3_900);
		const executions = Array.from({ length: 40 }, (_, i) =>
			makeExecution({ id: `exec-${i}`, userMessage: `${bigText}-${i}` }),
		);

		const pages = readAllPages(executions);
		const transcript = joined(pages);

		expect(pages.length).toBeGreaterThan(1);
		expect(transcript).toContain('scope: whole session, turns: 40');
		expect(transcript).not.toContain('[transcript truncated');
		expect(transcript.match(/## Turn/g)).toHaveLength(40);
		for (let i = 1; i < 40; i++) {
			expect(transcript.indexOf(`${bigText}-${i}\n`)).toBeGreaterThan(
				transcript.indexOf(`${bigText}-${i - 1}\n`),
			);
		}
	});

	it('produces the same transcript for every page size', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'Hello 👋 there', timeline: [toolCallEvent()] }),
			makeExecution({ id: 'exec-2', userMessage: 'Second 🎉 turn' }),
		];
		const expected = joined(readAllPages(executions));

		for (const maxChars of [2, 3, 7, 50]) {
			const pages = readAllPages(executions, { maxChars });
			expect(joined(pages)).toBe(expected);
			for (const page of pages) expect(page.transcript.length).toBeLessThanOrEqual(maxChars);
		}
	});

	it('scopes pages to the selected turn and its resumed parts', () => {
		const resumedOutput = `${'r'.repeat(5_000)}-end`;
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'Turn one' }),
			makeExecution({
				id: 'exec-2',
				userMessage: 'Turn two',
				timeline: [
					{ type: 'suspension', toolName: 'ask_question', toolCallId: 'tc-1', timestamp: 1 },
				],
			}),
			makeExecution({
				id: 'exec-3',
				userMessage: null,
				timeline: [
					{ type: 'hitl-response', toolCallId: 'tc-1', response: { ok: true }, timestamp: 2 },
					toolCallEvent({ output: { resumedOutput } }),
				],
			}),
			makeExecution({ id: 'exec-4', userMessage: 'Turn three' }),
		];

		const transcript = joined(readAllPages(executions, { executionId: 'exec-3', maxChars: 1_000 }));

		expect(transcript).toContain('scope: single turn, turns: 2');
		expect(transcript).toContain('User: Turn two');
		expect(transcript).toContain('[suspended waiting on ask_question]');
		expect(transcript).toContain(`Output: ${JSON.stringify({ resumedOutput })}`);
		expect(transcript).not.toContain('Turn one');
		expect(transcript).not.toContain('Turn three');
	});

	it('keeps the position when turns are added between pages', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: `${'a'.repeat(300)}-end` }),
			makeExecution({ id: 'exec-2', userMessage: 'Second' }),
		];
		const first = formatFullSessionContextPage(makeThread(), executions, { maxChars: 400 });
		if (!first.ok) throw new Error(first.reason);

		const second = formatFullSessionContextPage(
			makeThread(),
			[...executions, makeExecution({ id: 'exec-3', userMessage: 'Third' })],
			{ cursor: first.nextCursor!, maxChars: 100_000 },
		);

		expect(second).toMatchObject({ ok: true, nextCursor: null });
		const transcript = first.transcript + (second.ok ? second.transcript : '');
		expect(transcript).toContain(`User: ${'a'.repeat(300)}-end`);
		expect(transcript).toContain('User: Second');
		expect(transcript).toContain('User: Third');
	});

	it('returns execution_not_found for an unknown executionId', () => {
		expect(
			formatFullSessionContextPage(makeThread(), [makeExecution()], { executionId: 'missing' }),
		).toEqual({ ok: false, reason: 'execution_not_found' });
	});

	it('rejects a malformed cursor and a cursor from another scope', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'x'.repeat(500) }),
			makeExecution({ id: 'exec-2', userMessage: 'Next' }),
		];
		const page = formatFullSessionContextPage(makeThread(), executions, { maxChars: 100 });
		if (!page.ok) throw new Error(page.reason);

		expect(
			formatFullSessionContextPage(makeThread(), executions, { cursor: 'not-a-cursor' }),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
		expect(
			formatFullSessionContextPage(makeThread(), executions, {
				executionId: 'exec-1',
				cursor: page.nextCursor!,
			}),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
	});

	it('rejects a cursor from another session', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'x'.repeat(500) }),
			makeExecution({ id: 'exec-2', userMessage: 'Next' }),
		];
		const page = formatFullSessionContextPage(makeThread(), executions, { maxChars: 300 });
		if (!page.ok) throw new Error(page.reason);

		expect(
			formatFullSessionContextPage(makeThread({ id: 'thread-2' }), executions, {
				cursor: page.nextCursor!,
			}),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
	});

	it('rejects a cursor with an offset past the end of its segment', () => {
		const executions = [makeExecution({ id: 'exec-1', userMessage: 'x'.repeat(500) })];
		const page = formatFullSessionContextPage(makeThread(), executions, { maxChars: 300 });
		if (!page.ok) throw new Error(page.reason);
		const decoded = JSON.parse(Buffer.from(page.nextCursor!, 'base64url').toString('utf8')) as {
			offset: number;
		};
		const forged = Buffer.from(JSON.stringify({ ...decoded, offset: 1_000_000 })).toString(
			'base64url',
		);

		expect(formatFullSessionContextPage(makeThread(), executions, { cursor: forged })).toEqual({
			ok: false,
			reason: 'invalid_cursor',
		});
	});

	it('reports session_changed when the text at the cursor changed between pages', () => {
		const running = makeExecution({
			id: 'exec-1',
			status: 'running',
			userMessage: `${'a'.repeat(500)}-end`,
		});
		const first = formatFullSessionContextPage(makeThread(), [running], { maxChars: 300 });
		if (!first.ok) throw new Error(first.reason);

		const second = formatFullSessionContextPage(
			makeThread(),
			[{ ...running, status: 'success', duration: 9_999 }],
			{ cursor: first.nextCursor! },
		);

		expect(second).toEqual({ ok: false, reason: 'session_changed' });
	});
});
