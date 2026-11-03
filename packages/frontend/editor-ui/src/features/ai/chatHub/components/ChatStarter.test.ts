import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ChatStarter from './ChatStarter.vue';

const goToUpgrade = vi.fn();
vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade }),
}));
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: () => true }));

describe('ChatStarter', () => {
	it('keeps the invite explanation and upgrade actions available without a tooltip', async () => {
		const user = userEvent.setup();
		const { getByTestId, getByRole, emitted } = createComponentRenderer(ChatStarter)({
			pinia: createTestingPinia(),
			props: { showWelcomeScreen: true },
		});
		const invite = getByTestId('welcome-invite-chat-users');
		expect(invite).toHaveAttribute('aria-disabled', 'true');
		const reason = document.getElementById(invite.getAttribute('aria-describedby')!);
		expect(reason).toBeVisible();
		expect(invite).toHaveAccessibleDescription('Upgrade to invite chat users. Read more here.');
		const upgrade = getByRole('button', { name: 'Upgrade' });
		invite.focus();
		await user.tab();
		expect(upgrade).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(goToUpgrade).toHaveBeenCalledWith('chat-hub', 'upgrade-advanced-permissions');
		await user.tab();
		expect(getByRole('link', { name: 'here.' })).toHaveFocus();
		expect(emitted('startNewChat')).toBeUndefined();
	});
});
