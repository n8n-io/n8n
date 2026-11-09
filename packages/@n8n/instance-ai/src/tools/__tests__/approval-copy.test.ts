import { approvalSummarySchema, formatApprovalMessage } from '../approval-copy';

describe('approval copy', () => {
	it('accepts a missing summary from a saved tool call', () => {
		expect(approvalSummarySchema.parse(undefined)).toBeUndefined();
		expect(formatApprovalMessage('Save the changes to this workflow')).toBe(
			'Save the changes to this workflow',
		);
	});

	it('shows only the concrete summary on one logical line', () => {
		const summary = approvalSummarySchema.parse('  Add a Slack notification\r\nafter\tthe check  ');
		expect(formatApprovalMessage('Save the changes to this workflow', summary)).toBe(
			'Add a Slack notification after the check',
		);
	});

	it('uses the fallback for whitespace-only summaries', () => {
		expect(formatApprovalMessage('Run this workflow live', ' \n\t ')).toBe(
			'Run this workflow live',
		);
	});

	it('preserves text after question marks', () => {
		expect(formatApprovalMessage('Save the changes to this workflow', 'Is "Paid?" set?')).toBe(
			'Is "Paid?" set?',
		);
	});

	it('accepts the summary length limit and rejects longer summaries', () => {
		expect(approvalSummarySchema.safeParse('a'.repeat(300)).success).toBe(true);
		expect(approvalSummarySchema.safeParse('a'.repeat(301)).success).toBe(false);
	});
});
