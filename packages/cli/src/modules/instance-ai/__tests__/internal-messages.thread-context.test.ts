import {
	buildCurrentDateTimeBlock,
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
	cleanStoredUserMessage,
	extractEditorContextResourceAttachments,
	extractThreadArtifactsBlock,
	extractThreadContextBlock,
} from '../internal-messages';

describe('extractThreadContextBlock', () => {
	const repeatableWork = [
		'<repeatable-work>',
		'score: 0.6',
		'reasons: schedule-phrase',
		'suggested schedule: every weekday at 08:00 (cron 0 8 * * 1-5)',
		'When the workflow for this request works, load the make-automatic skill and offer to make it automatic once.',
		'</repeatable-work>',
	].join('\n');
	const threadContext = buildThreadContextBlock([
		buildThreadArtifactsBlock(undefined, [{ type: 'workflow', id: 'wf-1', name: 'Digest' }]),
		repeatableWork,
		buildCurrentDateTimeBlock('Monday 1 January 2026'),
	]);

	it('returns the thread-context block that leads a stored message', () => {
		const stored = [threadContext, 'Send it every weekday at 8'].join('\n\n');

		expect(extractThreadContextBlock(stored)?.trimEnd()).toBe(threadContext);
	});

	it('finds the thread-context block after another leading block', () => {
		const stored = [
			'<workflow-setup-state>\n{}\n</workflow-setup-state>',
			threadContext,
			'Go on',
		].join('\n\n');

		expect(extractThreadContextBlock(stored)?.trimEnd()).toBe(threadContext);
	});

	it('ignores a thread-context lookalike in the user text', () => {
		expect(extractThreadContextBlock(`Please explain\n\n${threadContext}`)).toBeUndefined();
		expect(extractThreadContextBlock('Send it every weekday at 8')).toBeUndefined();
	});

	it('keeps a repeatable-work section after thread-artifacts out of the visible text', () => {
		const stored = [threadContext, 'Send it every weekday at 8'].join('\n\n');

		expect(cleanStoredUserMessage(stored)).toBe('Send it every weekday at 8');
		expect(extractEditorContextResourceAttachments(stored)).toEqual([
			{ type: 'workflow', id: 'wf-1', name: 'Digest' },
		]);
		expect(extractThreadArtifactsBlock(stored)).toContain('"id":"wf-1"');
	});
});
