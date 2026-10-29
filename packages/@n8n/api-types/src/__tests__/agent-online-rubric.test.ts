import {
	RunAgentOnlineChecksDto,
	UpdateAgentOnlineCheckDto,
	ReviewAgentOnlineCheckDto,
} from '../agent-online-rubric';

describe('RunAgentOnlineChecksDto', () => {
	it('accepts a selected session list', () => {
		expect(
			RunAgentOnlineChecksDto.safeParse({ sessionIds: ['thread-1', 'thread-2'] }).success,
		).toBe(true);
	});
	it('accepts an omitted selection for existing callers', () => {
		expect(RunAgentOnlineChecksDto.safeParse({}).success).toBe(true);
	});
	it.each([[], [''], Array.from({ length: 11 }, (_, i) => `thread-${i}`)])(
		'rejects an invalid selection %j',
		(...sessionIds) => {
			expect(RunAgentOnlineChecksDto.safeParse({ sessionIds }).success).toBe(false);
		},
	);
});

describe('rubric review input', () => {
	it('accepts a check with a conditional or universal scope', () => {
		expect(
			UpdateAgentOnlineCheckDto.safeParse({
				question: 'Was it clear?',
				reason: 'Use clear language',
				appliesWhen: null,
			}).success,
		).toBe(true);
	});
	it('rejects blank check wording', () => {
		expect(
			UpdateAgentOnlineCheckDto.safeParse({
				question: '  ',
				reason: 'Use clear language',
				appliesWhen: null,
			}).success,
		).toBe(false);
	});
	it('accepts a human review', () => {
		expect(ReviewAgentOnlineCheckDto.safeParse({ feedback: 'good' }).success).toBe(true);
	});
	it('rejects an unknown feedback value', () => {
		expect(ReviewAgentOnlineCheckDto.safeParse({ feedback: 'pass' }).success).toBe(false);
	});
});
