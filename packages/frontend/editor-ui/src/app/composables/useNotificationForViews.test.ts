import { VIEWS } from '@n8n/frontend-constants/views';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useNotificationForViews } from '@/app/composables/useNotificationForViews';

const showMessage = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

/**
 * Relocated from `@n8n/composables/useToast`. Behaviour must be
 * unchanged from the package version, so these assert the same things its package
 * tests did.
 */
describe('useNotificationForViews', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		showMessage.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the notifications queued for a view and clears the queue', () => {
		const store = useNotificationsStore();
		store.setNotificationsForView(VIEWS.WORKFLOW, [{ message: 'Queued', title: 'Queued title' }]);

		useNotificationForViews().showNotificationForViews([VIEWS.WORKFLOW]);

		// Staggered by a 5ms timeout so toasts don't stack on top of each other.
		vi.advanceTimersByTime(10);

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Queued', title: 'Queued title' }),
		);
		expect(store.pendingNotificationsForViews[VIEWS.WORKFLOW]).toEqual([]);
	});

	it('does nothing when the view has no queued notifications', () => {
		useNotificationForViews().showNotificationForViews([VIEWS.WORKFLOW]);
		vi.advanceTimersByTime(10);

		expect(showMessage).not.toHaveBeenCalled();
	});

	it('clears only WORKFLOW regardless of the views passed', () => {
		// Asserts CURRENT behaviour, not correct behaviour: `NodeView.vue` passes
		// `[WORKFLOW, NEW_WORKFLOW]`, so the second queue survives. Pre-existing and
		// carried over unchanged by the relocation; correcting it belongs with N8N-103.
		const store = useNotificationsStore();
		store.setNotificationsForView(VIEWS.WORKFLOW, [{ message: 'A' }]);
		store.setNotificationsForView(VIEWS.NEW_WORKFLOW, [{ message: 'B' }]);

		useNotificationForViews().showNotificationForViews([VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW]);
		vi.advanceTimersByTime(10);

		expect(store.pendingNotificationsForViews[VIEWS.WORKFLOW]).toEqual([]);
		expect(store.pendingNotificationsForViews[VIEWS.NEW_WORKFLOW]).toEqual([{ message: 'B' }]);
	});
});
