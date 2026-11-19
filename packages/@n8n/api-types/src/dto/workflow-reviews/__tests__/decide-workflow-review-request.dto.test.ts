import { DecideWorkflowReviewRequestDto } from '../decide-workflow-review-request.dto';

describe('DecideWorkflowReviewRequestDto', () => {
	describe('accepted', () => {
		test.each([
			{ name: 'approved decision', request: { decision: 'approved' } },
			{ name: 'changes_requested decision', request: { decision: 'changes_requested' } },
			{
				name: 'approved decision with a note',
				request: { decision: 'approved', note: 'Ships as is' },
			},
			{
				name: 'changes_requested decision with a note',
				request: { decision: 'changes_requested', note: 'Please rename the node' },
			},
		])('accepts $name', ({ request }) => {
			const result = DecideWorkflowReviewRequestDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(request);
		});

		// Its own test because the table above asserts `toMatchObject(request)`, which a row
		// whose point is that the output differs from the input cannot satisfy.
		test('trims the note', () => {
			const result = DecideWorkflowReviewRequestDto.safeParse({
				decision: 'approved',
				note: '  first line\nsecond line  ',
			});

			expect(result.data?.note).toBe('first line\nsecond line');
		});
	});

	describe('rejected', () => {
		test.each([
			{
				name: 'missing decision',
				request: {},
				expectedErrorPath: ['decision'],
			},
			{
				name: 'pending decision',
				request: { decision: 'pending' },
				expectedErrorPath: ['decision'],
			},
			{
				name: 'unknown decision',
				request: { decision: 'rejected' },
				expectedErrorPath: ['decision'],
			},
			{
				name: 'non-string decision',
				request: { decision: 1 },
				expectedErrorPath: ['decision'],
			},
			{
				name: 'a note that is only whitespace',
				request: { decision: 'changes_requested', note: '   \n  ' },
				expectedErrorPath: ['note'],
			},
			{
				name: 'a note over the length limit',
				request: { decision: 'changes_requested', note: 'x'.repeat(10_001) },
				expectedErrorPath: ['note'],
			},
			{
				name: 'a note containing a control character',
				request: { decision: 'changes_requested', note: 'oops \x00 here' },
				expectedErrorPath: ['note'],
			},
		])('rejects $name', ({ request, expectedErrorPath }) => {
			const result = DecideWorkflowReviewRequestDto.safeParse(request);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});
