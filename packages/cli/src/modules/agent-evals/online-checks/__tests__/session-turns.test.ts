import { mergeResumedTurns, turnForExecution } from '../session-turns';
import type { ChatTurn } from '../types';

describe('mergeResumedTurns', () => {
	const asked: ChatTurn = {
		userMessage: 'Refund order 12',
		reply: '',
		timeline: [{ type: 'suspension', toolName: 'refund', toolCallId: 'r1', timestamp: 1 }],
	};
	const resumed: ChatTurn = {
		userMessage: '',
		reply: 'Refunded.',
		timeline: [
			{ type: 'hitl-response', toolCallId: 'r1', response: { approved: true }, timestamp: 2 },
		],
	};

	it('joins an execution that resumes after an approval to the turn that asked for it', () => {
		const merged = mergeResumedTurns([asked, resumed]);

		expect(merged).toEqual([
			{
				userMessage: 'Refund order 12',
				reply: 'Refunded.',
				timeline: [...(asked.timeline ?? []), ...(resumed.timeline ?? [])],
			},
		]);
	});

	it('keeps ordinary turns apart', () => {
		const next: ChatTurn = { userMessage: 'Thanks', reply: 'You are welcome.', timeline: [] };
		expect(mergeResumedTurns([asked, resumed, next])).toHaveLength(2);
	});

	it('keeps a failed resume marked as failed', () => {
		const [merged] = mergeResumedTurns([asked, { ...resumed, runFailed: true }]);
		expect(merged.runFailed).toBe(true);
	});
});

describe('turnForExecution', () => {
	const asked: ChatTurn = {
		userMessage: 'Refund order 12',
		reply: '',
		timeline: [{ type: 'suspension', toolName: 'refund', toolCallId: 'r1', timestamp: 1 }],
	};
	const resumed: ChatTurn = {
		userMessage: '',
		reply: 'Refunded.',
		timeline: [
			{ type: 'hitl-response', toolCallId: 'r1', response: { approved: true }, timestamp: 2 },
		],
	};
	const next: ChatTurn = { userMessage: 'Thanks', reply: 'You are welcome.', timeline: [] };
	const executions = [
		{ id: 'e1', turn: asked },
		{ id: 'e2', turn: resumed },
		{ id: 'e3', turn: next },
	];

	it('returns the whole turn for the execution that resumed after an approval', () => {
		expect(turnForExecution(executions, 'e2')).toEqual(mergeResumedTurns([asked, resumed])[0]);
	});

	it('returns the same whole turn for the execution that asked for the approval', () => {
		expect(turnForExecution(executions, 'e1')).toEqual(mergeResumedTurns([asked, resumed])[0]);
	});

	it('returns an ordinary turn as it is', () => {
		expect(turnForExecution(executions, 'e3')).toEqual(next);
	});

	it('returns undefined for an execution that is not in the session', () => {
		expect(turnForExecution(executions, 'missing')).toBeUndefined();
	});
});
