import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { useLogsStore } from '@/app/stores/logs.store';
import InstanceAiLayout from './InstanceAiLayout.vue';

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
	})),
}));

// The merged layout reads the thread id from the route and asks the Instance AI
// store whether an onboarding thread hides the sidebar. Neither matters here.
vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: () => ({ params: {}, query: {}, meta: {}, name: 'instance-ai' }),
	};
});
vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(() => ({ isOnboardingChromeHidden: () => false })),
}));

const renderComponent = createComponentRenderer(InstanceAiLayout, {
	global: {
		stubs: {
			AppSidebar: {
				template: '<div data-test-id="app-sidebar">App Sidebar</div>',
			},
			RouterView: {
				template: '<div>Assistant Content</div>',
			},
			Suspense: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('InstanceAiLayout', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('starts with the logs panel closed and keeps its own state while the user is away', () => {
		const logsStore = useLogsStore();
		// The editor left the panel open in the shared store.
		logsStore.toggleOpen(true);
		const first = renderComponent();
		expect(logsStore.isOpen).toBe(false);

		// The user opens the panel, goes to the editor and comes back.
		logsStore.toggleOpen(true);
		first.unmount();
		logsStore.toggleOpen(false);
		const second = renderComponent();
		expect(logsStore.isOpen).toBe(true);

		// The user closes it and leaves again: the closed state comes back too.
		logsStore.toggleOpen(false);
		second.unmount();
		logsStore.toggleOpen(true);
		renderComponent();
		expect(logsStore.isOpen).toBe(false);
	});
});
