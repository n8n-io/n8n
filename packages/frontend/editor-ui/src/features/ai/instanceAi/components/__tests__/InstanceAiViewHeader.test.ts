import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAssistantCreditsStore } from '../../assistantCredits.store';
import { useInstanceAiStore } from '../../instanceAi.store';
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
			CreditsSettingsDropdown: defineComponent({
				props: ['creditsRemaining', 'creditsQuota', 'creditsUsed', 'isLowCredits'],
				setup(props) {
					return () =>
						h(
							'div',
							{ 'data-test-id': 'credits-dropdown' },
							JSON.stringify({
								remaining: props.creditsRemaining,
								quota: props.creditsQuota,
								used: props.creditsUsed ?? null,
								low: props.isLowCredits,
							}),
						);
				},
			}),
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

	it('shows the instance credits and the thread total that it gets', function () {
		const credits = mockedStore(useAssistantCreditsStore);
		credits.creditsRemaining = 40;
		credits.creditsQuota = 50;
		credits.isLowCredits = false;

		const { getByTestId } = renderHeader({ props: { threadCreditsUsed: 2.5 } });

		expect(JSON.parse(getByTestId('credits-dropdown').textContent ?? '')).toEqual({
			remaining: 40,
			quota: 50,
			used: 2.5,
			low: false,
		});
		// The current Assistant store has no say in the credits.
		expect(mockedStore(useInstanceAiStore).threadCreditsUsed).not.toHaveBeenCalled();
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
