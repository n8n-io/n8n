import type {
	AgentSessionThread,
	AgentSessionTurn,
} from '@/modules/agents/agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];
import {
	formatPreviewSessionContext,
	formatPreviewSessionContextPage,
	FULL_TRANSCRIPT_PAGE_CHARS,
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
	const INTRO_END = 'so you can assess its behavior and improve its configuration.';
	const START_MARKER = /^\n\[continued from the previous page[^\]]*\]/;
	const END_MARKER = '\n[transcript continues on the next page]';
	const CLOSING = `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;

	function pageBody(transcript: string): string {
		let body = transcript.slice(transcript.indexOf(INTRO_END) + INTRO_END.length);
		body = body.slice(0, -CLOSING.length).replace(START_MARKER, '');
		return body.endsWith(END_MARKER) ? body.slice(0, -END_MARKER.length) : body;
	}

	function readAllPages(
		executions: AgentSessionTurn[],
		options: { executionId?: string; pageSize?: number } = {},
	) {
		const pages: string[] = [];
		let cursor: string | undefined;
		for (;;) {
			const page = formatPreviewSessionContextPage(makeThread(), executions, {
				...options,
				cursor,
			});
			if (!page.ok) throw new Error(page.reason);
			pages.push(page.transcript);
			if (page.nextCursor === null) break;
			cursor = page.nextCursor;
		}
		return { pages, body: pages.map(pageBody).join('') };
	}

	it('returns long text fields without truncation', () => {
		const userText = 'u'.repeat(10_000);
		const assistantText = 'a'.repeat(10_000);
		const reasoningText = 'r'.repeat(10_000);
		const page = formatPreviewSessionContextPage(makeThread(), [
			makeExecution({
				userMessage: userText,
				timeline: [
					{ type: 'reasoning', content: reasoningText, timestamp: 0, endTime: 1 },
					{ type: 'text', content: assistantText, timestamp: 1, endTime: 2 },
				],
			}),
		]);

		expect(page).toEqual({ ok: true, transcript: expect.any(String), nextCursor: null });
		const transcript = page.ok ? page.transcript : '';
		expect(transcript.startsWith(PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(transcript.endsWith(PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(transcript).toContain('scope: whole session, turns: 1, output: full');
		expect(transcript).toContain(`User: ${userText}\n`);
		expect(transcript).toContain(`Reasoning: ${reasoningText}\n`);
		expect(transcript).toContain(`Assistant: ${assistantText}\n`);
		expect(transcript).not.toContain('… [truncated]');
		expect(transcript).not.toContain(END_MARKER);
	});

	it('returns long tool values without truncation', () => {
		const input = { query: 'i'.repeat(8_000) };
		const output = { blob: 'o'.repeat(8_000) };
		const page = formatPreviewSessionContextPage(makeThread(), [
			makeExecution({ timeline: [toolCallEvent({ input, output })] }),
		]);

		expect(page.ok && page.nextCursor).toBeNull();
		const transcript = page.ok ? page.transcript : '';
		expect(transcript).toContain(`  Input: ${JSON.stringify(input)}\n`);
		expect(transcript).toContain(`  Output: ${JSON.stringify(output)}\n`);
		expect(transcript).not.toContain('… [truncated]');
	});

	it('pages a long session and returns every turn in order', () => {
		const bigText = 'y'.repeat(3_900);
		const executions = Array.from({ length: 40 }, (_, i) =>
			makeExecution({ id: `exec-${i}`, userMessage: `${bigText}-${i}` }),
		);

		const { pages, body } = readAllPages(executions);

		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) {
			expect(pageBody(page).length).toBeLessThanOrEqual(FULL_TRANSCRIPT_PAGE_CHARS);
		}
		expect(pages[0]).toContain(END_MARKER);
		expect(pages[1]).toMatch(/\[continued from the previous page/);
		expect(pages.at(-1)).not.toContain(END_MARKER);
		const turnNumbers = [...body.matchAll(/User: y+-(\d+)(?=\n|$)/g)].map(([, n]) => Number(n));
		expect(turnNumbers).toEqual(Array.from({ length: 40 }, (_, i) => i));
		expect(body.match(/## Turn/g)).toHaveLength(40);
	});

	it('splits a single value that is larger than one page across pages', () => {
		const output = { blob: 'z'.repeat(25_000) };
		const executions = [makeExecution({ timeline: [toolCallEvent({ output })] })];

		const { pages, body } = readAllPages(executions, { pageSize: 10_000 });

		expect(pages.length).toBeGreaterThanOrEqual(3);
		expect(pages[1]).toContain('[continued from the previous page, inside turn 1]');
		expect(body).toContain(`  Output: ${JSON.stringify(output)}`);
		const unpaged = formatPreviewSessionContextPage(makeThread(), executions);
		expect(unpaged.ok && pageBody(unpaged.transcript)).toBe(body);
	});

	it('does not split a surrogate pair at a page boundary', () => {
		const executions = [makeExecution({ userMessage: '😀'.repeat(50) })];

		const { pages, body } = readAllPages(executions, { pageSize: 7 });

		expect(body).toContain(`User: ${'😀'.repeat(50)}`);
		for (const page of pages) {
			expect(page).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
		}
	});

	it('scopes the pages to the selected turn and its resumed parts', () => {
		const resumedOutput = 'r'.repeat(12_000);
		const executions = [
			makeExecution({ id: 'exec-0', userMessage: 'Earlier turn' }),
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
					{ type: 'text', content: resumedOutput, timestamp: 4, endTime: 5 },
				],
			}),
			makeExecution({ id: 'exec-3', userMessage: 'Turn two' }),
		];

		const { pages, body } = readAllPages(executions, { executionId: 'exec-2', pageSize: 5_000 });

		expect(pages.length).toBeGreaterThan(1);
		expect(pages[0]).toContain('scope: single turn, turns: 2, output: full');
		expect(body).toContain('User: Turn one');
		expect(body).toContain('Before suspension.');
		expect(body).toContain('Human response: {"approved":true}');
		expect(body).toContain(`Assistant: ${resumedOutput}`);
		expect(body).not.toContain('Earlier turn');
		expect(body).not.toContain('Turn two');
	});

	it('keeps a cursor valid when later turns are appended', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'a'.repeat(300) }),
			makeExecution({ id: 'exec-2', userMessage: 'Second' }),
		];
		const first = formatPreviewSessionContextPage(makeThread(), executions, { pageSize: 100 });
		if (!first.ok || first.nextCursor === null) throw new Error('expected a next page');

		const next = formatPreviewSessionContextPage(
			makeThread(),
			[...executions, makeExecution({ id: 'exec-3', userMessage: 'Third' })],
			{ cursor: first.nextCursor },
		);

		expect(next).toMatchObject({ ok: true, nextCursor: null });
		const nextPage = next.ok ? next.transcript : '';
		expect(nextPage).toContain('turns: 3');
		const joined = pageBody(first.transcript) + pageBody(nextPage);
		expect(joined).toContain(`User: ${'a'.repeat(300)}\n`);
		expect(joined.indexOf('User: Second')).toBeGreaterThan(joined.indexOf('a'.repeat(300)));
		expect(joined.indexOf('User: Third')).toBeGreaterThan(joined.indexOf('User: Second'));
	});

	it('rejects a cursor from another scope or an unreadable cursor', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'a'.repeat(300) }),
			makeExecution({ id: 'exec-2', userMessage: 'b'.repeat(300) }),
		];
		const scoped = formatPreviewSessionContextPage(makeThread(), executions, {
			executionId: 'exec-1',
			pageSize: 100,
		});
		if (!scoped.ok || scoped.nextCursor === null) throw new Error('expected a next page');

		expect(
			formatPreviewSessionContextPage(makeThread(), executions, { cursor: scoped.nextCursor }),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
		expect(
			formatPreviewSessionContextPage(makeThread(), executions, { cursor: 'not-a-cursor' }),
		).toEqual({ ok: false, reason: 'invalid_cursor' });
		const pastEnd = Buffer.from(
			JSON.stringify({ executionId: null, turnId: 'exec-1', offset: 1_000_000 }),
		).toString('base64url');
		expect(formatPreviewSessionContextPage(makeThread(), executions, { cursor: pastEnd })).toEqual({
			ok: false,
			reason: 'invalid_cursor',
		});
	});

	it('reports an unknown executionId', () => {
		expect(
			formatPreviewSessionContextPage(makeThread(), [makeExecution()], { executionId: 'missing' }),
		).toEqual({ ok: false, reason: 'execution_not_found' });
	});
});
