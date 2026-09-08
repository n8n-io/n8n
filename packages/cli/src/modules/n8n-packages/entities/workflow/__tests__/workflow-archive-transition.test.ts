import { decideWorkflowArchiveTransition } from '../workflow-archive-transition';

describe('decideWorkflowArchiveTransition', () => {
	it.each([
		{ packageArchived: false, existingArchived: false },
		{ packageArchived: true, existingArchived: true },
	])('returns no transition when both states are $packageArchived', (input) => {
		expect(
			decideWorkflowArchiveTransition(input.packageArchived, input.existingArchived),
		).toBeNull();
	});

	it('archives an active target for an archived package workflow', () => {
		expect(decideWorkflowArchiveTransition(true, false)).toBe('archive');
	});

	it('unarchives an archived target for an active package workflow', () => {
		expect(decideWorkflowArchiveTransition(false, true)).toBe('unarchive');
	});

	it.each([true, false])(
		'returns no transition without a lifecycle file, target archived: %s',
		(existingArchived) => {
			expect(decideWorkflowArchiveTransition(undefined, existingArchived)).toBeNull();
		},
	);
});
