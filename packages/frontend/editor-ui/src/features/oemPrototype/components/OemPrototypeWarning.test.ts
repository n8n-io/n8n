import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY } from '@/features/oemPrototype/oemPrototype.constants';

import OemPrototypeWarning from './OemPrototypeWarning.vue';

const renderComponent = createComponentRenderer(OemPrototypeWarning);

describe('OemPrototypeWarning', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
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
		expect(dismissButton).toHaveClass('ghost', 'xsmall');
		expect(getByText("Usage reporting isn't reaching n8n")).toBeVisible();
		expect(
			getByText(
				"This instance hasn't sent a usage report since {date}. Contact your admin or check the airgap monitoring service.",
			),
		).toBeVisible();
	});

	it('should match the alert effect to the applied theme', async () => {
		const { getByRole } = renderComponent();
		const uiStore = useUIStore();

		uiStore.setTheme('light');
		await nextTick();
		expect(getByRole('alert')).toHaveClass('light');
		expect(getByRole('alert')).not.toHaveClass('dark');

		uiStore.setTheme('dark');
		await nextTick();
		expect(getByRole('alert')).toHaveClass('dark');
		expect(getByRole('alert')).not.toHaveClass('light');
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
