import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import ResultsCaseRow from './ResultsCaseRow.vue';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import type { ResultCheck } from '../../evaluation.utils';
import type { ExpectedField } from '../../evaluation.constants';

const renderComponent = createComponentRenderer(ResultsCaseRow);

const checks: ResultCheck[] = [
	{ key: 'correctness', label: 'Correctness', isAiJudged: true, icon: 'badge-check' },
	{ key: 'categorization', label: 'Exact match', isAiJudged: false, icon: 'tags' },
];

const expectedFields: ExpectedField[] = [
	{ name: 'expectedAnswer', labelKey: 'evaluations.wizardSidepanel.step2.expectedAnswer' },
];

function makeCase(metrics: Record<string, number>): TestCaseExecutionRecord {
	return {
		id: 'case-1',
		executionId: null,
		status: 'success',
		createdAt: '',
		updatedAt: '',
		runAt: null,
		metrics,
		inputs: { expectedAnswer: 'Hello there' },
		outputs: { output: 'Hi!' },
	};
}

const baseProps = () => ({
	caseIndex: 1,
	testCase: makeCase({ correctness: 1, categorization: 1, totalTokens: 2509, executionTime: 6300 }),
	checks,
	expectedFields,
	expectedValues: {},
	aiAnswer: 'Hi!',
	runMetrics: {},
});

describe('ResultsCaseRow', () => {
	it('renders the collapsed row with case label and per-check scores', () => {
		const { getByText, getByTestId, queryByTestId } = renderComponent({ props: baseProps() });

		expect(getByText('Case #1')).toBeInTheDocument();
		// AI-judged checks show the out-of-5 score.
		expect(getByText('1 / 5')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-case-1')).toBeInTheDocument();
		// Detail is collapsed by default.
		expect(queryByTestId('evaluations-wizard-sidepanel-case-detail-1')).toBeNull();
	});

	it('shows a pass tick for a perfect pass/fail score', () => {
		const { container } = renderComponent({ props: baseProps() });
		expect(container.querySelector('[data-icon="check"]')).not.toBeNull();
		expect(container.querySelector('[data-icon="x"]')).toBeNull();
	});

	it('shows a fail cross when a pass/fail check is not a perfect score', () => {
		const props = { ...baseProps(), testCase: makeCase({ correctness: 1, categorization: 0 }) };
		const { container } = renderComponent({ props });
		expect(container.querySelector('[data-icon="x"]')).not.toBeNull();
	});

	it('expands on caret click to reveal expected output, the AI answer and metrics', async () => {
		const { getByTestId, getByText, queryByText } = renderComponent({ props: baseProps() });

		// Expected/answer values are not in the DOM until expanded.
		expect(queryByText('Hello there')).toBeNull();

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-case-toggle-1'));

		expect(getByTestId('evaluations-wizard-sidepanel-case-detail-1')).toBeInTheDocument();
		expect(getByText('Hello there')).toBeInTheDocument(); // expected output
		expect(getByText('Hi!')).toBeInTheDocument(); // AI's answer
		expect(getByText(/Tokens: 2,509\b/)).toBeInTheDocument(); // operational metrics, no "t" unit
	});

	it('falls back to the Step-2 expected value when the case has no dataset value', async () => {
		const props = {
			...baseProps(),
			testCase: { ...makeCase({ correctness: 5, categorization: 1 }), inputs: {} },
			expectedValues: { expectedAnswer: 'From step 2' },
		};
		const { getByTestId, getByText } = renderComponent({ props });

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-case-toggle-1'));
		expect(getByText('From step 2')).toBeInTheDocument();
	});
});
