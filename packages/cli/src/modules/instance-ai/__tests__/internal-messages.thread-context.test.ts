import {
	buildCurrentDateTimeBlock,
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
	cleanStoredUserMessage,
	extractEditorContextResourceAttachments,
	extractThreadArtifactsBlock,
	extractThreadContextBlock,
	stripAttachmentManifest,
	withoutAiPreferencesBlock,
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

describe('stripAttachmentManifest', () => {
	const manifest = [
		'[ATTACHMENTS]',
		'- [0] `sales-daily.csv` (text/csv): parseable via parse-file (format: csv)',
		'- [1] `notes.txt` (text/plain): not a supported structured format',
		'[/ATTACHMENTS]',
	].join('\n');

	it('removes the manifest after the user text', () => {
		expect(stripAttachmentManifest(`Sum the totals\n\n${manifest}`)).toBe('Sum the totals');
	});

	it('removes a manifest that is the whole text', () => {
		expect(stripAttachmentManifest(manifest)).toBe('');
	});

	it('removes a manifest that a cleaned legacy message ends with', () => {
		expect(stripAttachmentManifest(`Sum the totals\n\n${manifest}\n`)).toBe('Sum the totals');
	});

	it('keeps a manifest that is not at the end', () => {
		const text = `${manifest}\n\nWhat do these files hold?`;

		expect(stripAttachmentManifest(text)).toBe(text);
	});

	it('keeps text that only looks like a manifest', () => {
		const inline = `See ${manifest}`;
		const otherLine = '[ATTACHMENTS]\nevery day at 9\n[/ATTACHMENTS]';

		expect(stripAttachmentManifest(inline)).toBe(inline);
		expect(stripAttachmentManifest(otherLine)).toBe(otherLine);
	});

	it('stays fast on a long text with many manifest openers', () => {
		const text = '\n\n[ATTACHMENTS]\n- [0] `a.csv` (text/csv): x\n'.repeat(50_000);

		const startedAt = performance.now();
		const result = stripAttachmentManifest(text);

		expect(result).toBe(text);
		expect(performance.now() - startedAt).toBeLessThan(1_000);
	});
});

describe('withoutAiPreferencesBlock', () => {
	const preferences = '<ai-preferences>\nKeep replies short.\n<repeatable-work>\n</ai-preferences>';
	const dateTime = buildCurrentDateTimeBlock('Monday 1 January 2026');

	it('removes the preferences block and keeps the other sections', () => {
		const threadContext = buildThreadContextBlock([preferences, dateTime]);

		const result = withoutAiPreferencesBlock(threadContext);

		expect(result).not.toContain('Keep replies short.');
		expect(result).not.toContain('<repeatable-work>');
		expect(result).toContain(dateTime);
	});

	it('returns a block without preferences as it is', () => {
		const threadContext = buildThreadContextBlock([dateTime]);

		expect(withoutAiPreferencesBlock(threadContext)).toBe(threadContext);
	});
});
