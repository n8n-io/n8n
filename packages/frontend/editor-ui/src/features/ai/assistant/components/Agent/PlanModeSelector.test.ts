import { describe, it, expect } from 'vitest';

import { renderComponent } from '@/__tests__/render';
import PlanModeSelector from './PlanModeSelector.vue';

function render(modelValue: 'build' | 'plan' = 'build') {
	return renderComponent(PlanModeSelector, {
		props: { modelValue },
	});
}

describe('PlanModeSelector', () => {
	it('renders with data-test-id', () => {
		const { getByTestId } = render();
		expect(getByTestId('plan-mode-selector')).toBeTruthy();
	});

	it('shows "Build" label when modelValue is build', () => {
		const { getByTestId } = render('build');
		const trigger = getByTestId('plan-mode-selector').querySelector('[role="combobox"]');
		expect(trigger?.textContent).toContain('Build');
	});

	it('shows "Plan" label when modelValue is plan', () => {
		const { getByTestId } = render('plan');
		const trigger = getByTestId('plan-mode-selector').querySelector('[role="combobox"]');
		expect(trigger?.textContent).toContain('Plan');
	});

	it('trigger is never disabled', () => {
		const { getByTestId } = render('build');
		const trigger = getByTestId('plan-mode-selector').querySelector('[role="combobox"]');
		expect(trigger?.hasAttribute('data-disabled')).toBe(false);
	});
});
