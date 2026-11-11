import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAssistantCreditsStore } from '../../assistantCredits.store';
import InstanceAiViewHeader from '../InstanceAiViewHeader.vue';

vi.mock('vue-router', async function (importOriginal) {
	return {
		...(await importOriginal<typeof import('vue-router')>()),
		useRoute: function () {
			return { params: {} };
		},
		useRouter: () => ({ push: vi.fn() }),
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
			CreditsSettingsDropdown: {
				props: ['creditsRemaining', 'creditsUsed'],
				template:
					'<div data-test-id="credits-dropdown">{{ creditsRemaining }}/{{ creditsUsed }}</div>',
			},
		},
	},
});

describe('InstanceAiViewHeader', function () {
	beforeEach(function () {
		setActivePinia(createTestingPinia());
	});

	it.each([undefined, ''])('shows Chat history when the title is %s', function (title) {
		const { getByRole } = renderHeader({ props: { title } });
		const button = getByRole('button', { name: 'Chat history' });
		const label = within(button).getByText('Chat history');

		expect(label).toBeVisible();
		expect(label).not.toHaveAttribute('aria-hidden', 'true');
		expect(button).not.toHaveAttribute('data-icon-only', 'true');
	});

	it('shows the instance balance and the thread total that it gets', function () {
		mockedStore(useAssistantCreditsStore).creditsRemaining = 40;

		const { getByTestId } = renderHeader({ props: { threadCreditsUsed: 2.5 } });

		expect(getByTestId('credits-dropdown')).toHaveTextContent('40/2.5');
	});

	it('hides the credits while the balance is unknown', function () {
		mockedStore(useAssistantCreditsStore).creditsRemaining = undefined;

		const { queryByTestId } = renderHeader();

		expect(queryByTestId('credits-dropdown')).not.toBeInTheDocument();
	});

	it('opens history from the chat title', async function () {
		const { getByRole } = renderHeader({ props: { title: 'Order help' } });
		const button = getByRole('button', { name: 'Order help' });

		expect(within(button).queryByText('Chat history')).not.toBeInTheDocument();
		await userEvent.click(within(button).getByText('Order help'));
		await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'));
		await waitFor(() => expect(button).toHaveFocus());
	});
});
