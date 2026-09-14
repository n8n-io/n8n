import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { ref } from 'vue';
import InstanceAiViewHeader from '../InstanceAiViewHeader.vue';
import { useInstanceAiStore } from '../../instanceAi.store';
import { SidebarStateKey } from '../../instanceAiLayout';

const renderHeader = createComponentRenderer(InstanceAiViewHeader, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: ref(true), toggle: vi.fn() },
		},
		stubs: {
			CreditsSettingsDropdown: {
				props: ['creditsUsed'],
				template: '<div data-test-id="credits-used">{{ creditsUsed }}</div>',
			},
		},
	},
});

describe('InstanceAiViewHeader', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		store = mockedStore(useInstanceAiStore);
		// Real state the `creditsRemaining` getter derives from, so the dropdown
		// (and its `threadCreditsUsed` lookup) actually renders.
		store.creditsQuota = 100;
		store.creditsClaimed = 20;
		store.threadCreditsUsed.mockImplementation((threadId: string) =>
			threadId === 'panel-thread' ? 2 : 0,
		);
	});

	it('shows the per-thread total for the threadId prop', () => {
		const { getByTestId } = renderHeader({ props: { threadId: 'panel-thread' } });

		expect(getByTestId('credits-used')).toHaveTextContent('2');
	});

	it('shows no per-thread total without a threadId', () => {
		const { getByTestId } = renderHeader();

		expect(getByTestId('credits-used')).toHaveTextContent('');
	});
});
