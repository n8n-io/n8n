import { describe, it, expect } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import ResultsSummaryHeader from './ResultsSummaryHeader.vue';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import type { ResultCheck } from '../../evaluation.utils';

const renderComponent = createComponentRenderer(ResultsSummaryHeader);

const aiCheck: ResultCheck = {
	key: 'correctness',
	label: 'Correctness',
	isAiJudged: true,
	icon: 'badge-check',
};
const passCheck: ResultCheck = {
	key: 'categorization',
	label: 'Exact match',
	isAiJudged: false,
	icon: 'tags',
};

function makeCase(metrics: Record<string, number>): TestCaseExecutionRecord {
	return {
		id: `case-${Math.random().toString(36).slice(2)}`,
		executionId: null,
		status: 'success',
		createdAt: '',
		updatedAt: '',
		runAt: null,
		metrics,
	};
}

describe('ResultsSummaryHeader', () => {
	it('shows the average out-of-5 score for AI-judged checks', () => {
		const { getByText } = renderComponent({
			props: { checks: [aiCheck], runMetrics: { correctness: 4 }, cases: [] },
		});
		expect(getByText(/Correctness avg 4 \/ 5/)).toBeInTheDocument();
	});

	it('shows cases passed of total for pass/fail checks (pass = perfect score)', () => {
		const cases = [
			makeCase({ categorization: 1 }),
			makeCase({ categorization: 0 }),
			makeCase({ categorization: 1 }),
		];
		const { getByText } = renderComponent({
			props: { checks: [passCheck], runMetrics: {}, cases },
		});
		expect(getByText(/Exact match: 2 of 3 passed/)).toBeInTheDocument();
	});

	it('renders a summary entry per check', () => {
		const { getByText } = renderComponent({
			props: {
				checks: [aiCheck, passCheck],
				runMetrics: { correctness: 5 },
				cases: [makeCase({ categorization: 1 })],
			},
		});
		expect(getByText(/Correctness avg 5 \/ 5/)).toBeInTheDocument();
		expect(getByText(/Exact match: 1 of 1 passed/)).toBeInTheDocument();
	});
});
