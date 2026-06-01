import { formatPreviousAttempts, type IterationEntry } from '../iteration-log';

describe('formatPreviousAttempts', () => {
	it('returns empty string for no entries', () => {
		expect(formatPreviousAttempts([])).toBe('');
	});

	it('formats a single failed attempt', () => {
		const entries: IterationEntry[] = [
			{ attempt: 1, action: 'build-workflow-with-agent', result: '', error: 'invalid_auth' },
		];
		const result = formatPreviousAttempts(entries);
		expect(result).toContain('<previous-attempts>');
		expect(result).toContain('</previous-attempts>');
		expect(result).toContain('Attempt 1');
		expect(result).toContain('FAILED: invalid_auth');
	});

	it('formats a successful attempt', () => {
		const entries: IterationEntry[] = [
			{ attempt: 1, action: 'delegate', result: 'Workflow executed successfully' },
		];
		const result = formatPreviousAttempts(entries);
		expect(result).toContain('Attempt 1: delegate → Workflow executed successfully');
	});

	it('includes diagnosis and fixApplied when present', () => {
		const entries: IterationEntry[] = [
			{
				attempt: 1,
				action: 'build-workflow-with-agent',
				result: '',
				error: 'missing credential',
				diagnosis: 'Slack credential not connected',
				fixApplied: 'Added Slack OAuth2 credential',
			},
		];
		const result = formatPreviousAttempts(entries);
		expect(result).toContain('Diagnosis: Slack credential not connected');
		expect(result).toContain('Fix applied: Added Slack OAuth2 credential');
	});

	it('formats multiple attempts in order', () => {
		const entries: IterationEntry[] = [
			{ attempt: 1, action: 'build', result: '', error: 'error 1' },
			{ attempt: 2, action: 'build', result: '', error: 'error 2' },
			{ attempt: 3, action: 'build', result: 'success' },
		];
		const result = formatPreviousAttempts(entries);
		expect(result).toContain('Attempt 1');
		expect(result).toContain('Attempt 2');
		expect(result).toContain('Attempt 3');
		// Verify ordering — attempt 1 comes before attempt 2
		expect(result.indexOf('Attempt 1')).toBeLessThan(result.indexOf('Attempt 2'));
	});

	it('truncates long result text to 200 chars', () => {
		const longResult = 'x'.repeat(300);
		const entries: IterationEntry[] = [{ attempt: 1, action: 'delegate', result: longResult }];
		const result = formatPreviousAttempts(entries);
		// The result portion should be truncated
		expect(result).not.toContain('x'.repeat(300));
		expect(result).toContain('x'.repeat(200));
	});
});
