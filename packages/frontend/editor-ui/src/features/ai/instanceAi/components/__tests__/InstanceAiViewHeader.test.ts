import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiViewHeader from '../InstanceAiViewHeader.vue';

vi.mock('vue-router', async function (importOriginal) {
	return {
		...(await importOriginal<typeof import('vue-router')>()),
		useRoute: function () {
			return { params: {} };
		},
	};
});

vi.mock('@/app/composables/usePageRedirectionHelper', function () {
	return {
		usePageRedirectionHelper: function () {
			return { goToUpgrade: vi.fn() };
		},
	};
});

const renderHeader = createComponentRenderer(InstanceAiViewHeader, {
	global: {
		stubs: {
			InstanceAiThreadList: { template: '<div><slot name="trigger" /></div>' },
			CreditsSettingsDropdown: true,
		},
	},
});

describe('InstanceAiViewHeader', function () {
	beforeEach(function () {
		setActivePinia(createTestingPinia());
	});

	it.each([undefined, true])(
		'shows the Chat history label when showThreadHistoryLabel is %s',
		function (showThreadHistoryLabel) {
			const { getByRole } = renderHeader({ props: { showThreadHistoryLabel } });
			const button = getByRole('button', { name: 'Chat history' });
			const label = within(button).getByText('Chat history');

			expect(label).toBeVisible();
			expect(label).not.toHaveAttribute('aria-hidden', 'true');
			expect(button).not.toHaveAttribute('data-icon-only', 'true');
		},
	);

	it('hides the label but keeps the button name when the label is disabled', function () {
		const { getByRole } = renderHeader({ props: { showThreadHistoryLabel: false } });
		const button = getByRole('button', { name: 'Chat history' });

		expect(within(button).queryByText('Chat history')).not.toBeInTheDocument();
		expect(button).toHaveAttribute('data-icon-only', 'true');
	});
});
