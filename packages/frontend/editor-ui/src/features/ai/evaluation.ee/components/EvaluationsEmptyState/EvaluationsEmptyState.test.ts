import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsEmptyState from './EvaluationsEmptyState.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const renderComponent = createComponentRenderer(EvaluationsEmptyState);

describe('EvaluationsEmptyState', () => {
	it('renders the heading, description, and all three feature columns', () => {
		const { getByTestId, getByText } = renderComponent();
		expect(getByTestId('evaluations-empty-state')).toBeInTheDocument();
		// Title + description copy comes from i18n keys; using the mocked
		// prefix ensures we verify the keys we intended (not arbitrary text).
		expect(getByText('mocked-evaluations.emptyState.title')).toBeInTheDocument();
		expect(getByText('mocked-evaluations.emptyState.description')).toBeInTheDocument();
		expect(getByText('mocked-evaluations.emptyState.catchIssues.title')).toBeInTheDocument();
		expect(getByText('mocked-evaluations.emptyState.buildConfidence.title')).toBeInTheDocument();
		expect(getByText('mocked-evaluations.emptyState.measurePerformance.title')).toBeInTheDocument();
	});

	it('emits get-started when the CTA is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		await userEvent.click(getByTestId('evaluations-empty-state-get-started'));
		expect(emitted('getStarted')).toBeTruthy();
	});

	it('disables the CTA when disabled prop is set (read-only environments)', () => {
		const { getByTestId } = renderComponent({ props: { disabled: true } });
		expect(getByTestId('evaluations-empty-state-get-started')).toBeDisabled();
	});
});
