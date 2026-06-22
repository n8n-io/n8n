import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseForm from './TestCaseForm.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const renderComponent = createComponentRenderer(TestCaseForm);

describe('TestCaseForm', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows the Input heading and an input field for each slice field', () => {
		const { getByTestId } = renderComponent({
			props: {
				sliceInputs: { fieldNames: ['query'], values: { query: '' }, hasExecution: true },
			},
		});

		expect(getByTestId('evaluations-wizard-sidepanel-input-heading')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-input-query')).toBeInTheDocument();
	});

	it('hides the Input heading when there are no input fields', () => {
		const { queryByTestId } = renderComponent({
			props: {
				sliceInputs: { fieldNames: [], values: {}, hasExecution: true },
			},
		});

		expect(queryByTestId('evaluations-wizard-sidepanel-input-heading')).toBeNull();
	});
});
