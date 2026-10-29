import { parseSessionTranscript } from '../session-transcript';

const transcript = `<preview_session_context>
Preview session transcript — title: Order help, session #2, scope: whole session, turns: 2

## Turn (status=success, model=anthropic/claude-sonnet-5-5, duration=900ms, tokens=1200)
User: Where is order 12?
It is late.
Tool call: get_order | kind=node | succeeded | 40ms | node=Shopify
  Input: {"id":"12"}
  Output: {"status":"shipped"}
Assistant: It shipped yesterday.
Second line.

## Turn (status=error, duration=300ms, error=boom)
User: Refund it
[suspended waiting on refund_order]
Human response: {"approved":false}
Tool call: refund_order | kind=node | failed | 10ms
  Input: {"id":"12"}
  Output: "Request failed… [truncated]
[stopped by guardrail budget_exceeded]
</preview_session_context>`;

describe('parseSessionTranscript', () => {
	const turns = parseSessionTranscript(transcript);

	it('reads one turn per turn header', () => {
		expect(turns).toHaveLength(2);
	});

	it('keeps multi-line user messages and replies', () => {
		expect(turns[0].userMessage).toBe('Where is order 12?\nIt is late.');
		expect(turns[0].reply).toBe('It shipped yesterday.\nSecond line.');
	});

	it('turns tool lines back into timeline events', () => {
		expect(turns[0].timeline).toEqual([
			expect.objectContaining({
				type: 'tool-call',
				name: 'get_order',
				kind: 'node',
				success: true,
				input: { id: '12' },
				output: { status: 'shipped' },
			}),
		]);
	});

	it('keeps a cut tool value as text', () => {
		const call = turns[1].timeline?.find((e) => e.type === 'tool-call');
		expect(call).toEqual(
			expect.objectContaining({ success: false, output: '"Request failed… [truncated]' }),
		);
	});

	it('pairs an approval answer with the suspension before it', () => {
		const events = turns[1].timeline ?? [];
		const suspension = events.find((e) => e.type === 'suspension');
		const answer = events.find((e) => e.type === 'hitl-response');
		expect(suspension).toEqual(expect.objectContaining({ toolName: 'refund_order' }));
		expect(answer).toEqual(
			expect.objectContaining({
				toolCallId: suspension?.type === 'suspension' ? suspension.toolCallId : '',
				response: { approved: false },
			}),
		);
	});

	it('reads a guardrail stop', () => {
		expect(turns[1].timeline).toContainEqual(
			expect.objectContaining({ type: 'guardrail', code: 'budget_exceeded' }),
		);
	});

	it('gives a turn with no assistant text an empty reply', () => {
		expect(turns[1].reply).toBe('');
	});

	it('marks a turn whose status is error as a failed run', () => {
		expect(turns[0].runFailed).toBeUndefined();
		expect(turns[1].runFailed).toBe(true);
	});

	it('drops the last turn when the transcript was cut before its end', () => {
		// Ends inside the second turn, after its user message.
		const cut = transcript.split('\n').slice(0, 15).join('\n');
		const parsed = parseSessionTranscript(cut);

		expect(parsed).toHaveLength(1);
		expect(parsed[0].reply).toBe('It shipped yesterday.\nSecond line.');
	});
});
