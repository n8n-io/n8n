import { mergeResumedTurns } from '../session-turns';
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
