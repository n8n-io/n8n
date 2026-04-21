import { formatAnswersForDiscovery } from '../submit-questions.tool';

const sampleQuestions = [
	{
		id: 'q1',
		question: 'Which email provider?',
		type: 'single' as const,
		options: ['Gmail', 'Outlook'],
	},
	{
		id: 'q2',
		question: 'How often should it run?',
		type: 'single' as const,
		options: ['Daily', 'Weekly'],
	},
	{ id: 'q3', question: 'Any extra details?', type: 'text' as const },
];

describe('formatAnswersForDiscovery', () => {
	describe('array format (QuestionResponse[])', () => {
		it('formats answered questions into clarification text', () => {
			const answers = [
				{ questionId: 'q1', question: 'Which email provider?', selectedOptions: ['Gmail'] },
				{ questionId: 'q2', question: 'How often should it run?', selectedOptions: ['Daily'] },
			];

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('User provided these clarifications:');
			expect(result).toContain('- Which email provider?: Gmail');
			expect(result).toContain('- How often should it run?: Daily');
			expect(result).toContain('Proceed with node discovery');
		});

		it('filters out skipped answers', () => {
			const answers = [
				{ questionId: 'q1', question: 'Which email provider?', selectedOptions: ['Gmail'] },
				{ questionId: 'q2', question: 'How often?', selectedOptions: [], skipped: true },
			];

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('Which email provider?');
			expect(result).not.toContain('How often?');
		});

		it('joins selectedOptions and customText', () => {
			const answers = [
				{
					questionId: 'q1',
					question: 'Which email provider?',
					selectedOptions: ['Gmail', 'Outlook'],
					customText: 'preferably Gmail',
				},
			];

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('- Which email provider?: Gmail, Outlook, preferably Gmail');
		});

		it('shows "(no answer)" when selectedOptions is empty and no customText', () => {
			const answers = [
				{ questionId: 'q1', question: 'Which email provider?', selectedOptions: [] },
			];

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('- Which email provider?: (no answer)');
		});

		it('uses customText alone when selectedOptions is empty', () => {
			const answers = [
				{
					questionId: 'q3',
					question: 'Any extra details?',
					selectedOptions: [],
					customText: 'I want error notifications too',
				},
			];

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('- Any extra details?: I want error notifications too');
		});
	});

	describe('record format (Record<string, string | string[]>)', () => {
		it('maps answers by question id', () => {
			const answers = {
				q1: 'Gmail',
				q2: 'Weekly',
			};

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('User provided these clarifications:');
			expect(result).toContain('- Which email provider?: Gmail');
			expect(result).toContain('- How often should it run?: Weekly');
		});

		it('joins array values with comma', () => {
			const answers = {
				q1: ['Gmail', 'Outlook'],
			};

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('- Which email provider?: Gmail, Outlook');
		});

		it('filters out questions with no matching answer', () => {
			const answers = {
				q1: 'Gmail',
				// q2 and q3 not answered
			};

			const result = formatAnswersForDiscovery(sampleQuestions, answers);

			expect(result).toContain('Which email provider?');
			expect(result).not.toContain('How often');
			expect(result).not.toContain('extra details');
		});
	});

	describe('invalid input', () => {
		it('returns fallback message for null', () => {
			const result = formatAnswersForDiscovery(sampleQuestions, null);

			expect(result).toContain('could not be parsed');
		});

		it('returns fallback message for a string', () => {
			const result = formatAnswersForDiscovery(sampleQuestions, 'some random text');

			expect(result).toContain('could not be parsed');
		});

		it('returns fallback message for a number', () => {
			const result = formatAnswersForDiscovery(sampleQuestions, 42);

			expect(result).toContain('could not be parsed');
		});

		it('returns fallback message for undefined', () => {
			const result = formatAnswersForDiscovery(sampleQuestions, undefined);

			expect(result).toContain('could not be parsed');
		});
	});
});
