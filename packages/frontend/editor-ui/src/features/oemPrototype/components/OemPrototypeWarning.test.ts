import { fireEvent } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY } from '@/features/oemPrototype/oemPrototype.constants';

import OemPrototypeWarning from './OemPrototypeWarning.vue';

const renderComponent = createComponentRenderer(OemPrototypeWarning);

describe('OemPrototypeWarning', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should show the usage reporting warning in an N8nAlert', () => {
		const { getByRole, getByText } = renderComponent();

		const dismissButton = getByRole('button', { name: 'Dismiss' });
		expect(getByRole('alert')).toHaveClass('n8n-alert');
		expect(dismissButton).toBeVisible();
		expect(dismissButton).toHaveClass('subtle', 'xsmall');
		expect(getByText("Usage reporting isn't reaching n8n")).toBeVisible();
		expect(
			getByText(
				"This instance hasn't sent a usage report since {date}. Contact your admin or check the airgap monitoring service.",
			),
		).toBeVisible();
	});

	it('should restore the warning two seconds after dismissal', async () => {
		const { getByRole, queryByRole } = renderComponent();

		await fireEvent.click(getByRole('button', { name: 'Dismiss' }));
		expect(queryByRole('alert')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY - 1);
		expect(queryByRole('alert')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1);
		expect(getByRole('alert')).toBeVisible();
	});
});
