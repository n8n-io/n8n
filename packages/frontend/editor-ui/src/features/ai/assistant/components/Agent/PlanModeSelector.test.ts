import { describe, it, expect } from 'vitest';

import { renderComponent } from '@/__tests__/render';
import PlanModeSelector from './PlanModeSelector.vue';

function render(modelValue: 'build' | 'plan' = 'build', disabled = false) {
	return renderComponent(PlanModeSelector, {
		props: { modelValue, disabled },
	});
}

describe('PlanModeSelector', () => {
	it('renders with data-test-id', () => {
		const { getByTestId } = render();
		expect(getByTestId('plan-mode-selector')).toBeTruthy();
	});

	it('shows "Build" label when modelValue is build', () => {
		const { getByTestId } = render('build');
		const button = getByTestId('plan-mode-selector').querySelector('button');
		expect(button?.textContent).toContain('Build');
	});

	it('shows "Plan" label when modelValue is plan', () => {
		const { getByTestId } = render('plan');
		const button = getByTestId('plan-mode-selector').querySelector('button');
		expect(button?.textContent).toContain('Plan');
	});

	it('disables the button when disabled prop is true', () => {
		const { getByTestId } = render('build', true);
		const button = getByTestId('plan-mode-selector').querySelector('button');
		expect(button?.hasAttribute('disabled')).toBe(true);
	});

	it('does not disable the button when disabled prop is false', () => {
		const { getByTestId } = render('build', false);
		const button = getByTestId('plan-mode-selector').querySelector('button');
		expect(button?.hasAttribute('disabled')).toBe(false);
	});
});
