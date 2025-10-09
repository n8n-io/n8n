import { defaultSettings } from '@/__tests__/defaults';
import { useLogsStore } from '@/stores/logs.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { setActivePinia } from 'pinia';
import { useFloatingUiOffsets } from './useFloatingUiOffsets';
import { reactive } from 'vue';
import { EDITABLE_CANVAS_VIEWS } from '@/constants';
import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';

let currentRouteName = '';

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() =>
		reactive({
			path: '/',
			params: {},
			name: currentRouteName,
		}),
	),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

describe(useFloatingUiOffsets, () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		currentRouteName = '';
		useWorkflowsStore().setNodes([createTestNode({ name: 'n0' })]);
	});

	describe('toastBottomOffset', () => {
		it('should account for the height of log view only when NDV is closed', () => {
			useLogsStore().setHeight(3);
			useNDVStore().setActiveNodeName('n0', 'other'); // set NDV to be opened

			const { toastBottomOffset } = useFloatingUiOffsets();

			expect(toastBottomOffset.value).toBe('0px');

			useNDVStore().unsetActiveNodeName(); // close NDV

			expect(toastBottomOffset.value).toBe('3px');
		});

		it.each(EDITABLE_CANVAS_VIEWS)(
			'should account for the height of AI assistant floating button in %s only when the button is displayed',
			async (view) => {
				currentRouteName = view;
				useSettingsStore().setSettings({
					...defaultSettings,
					aiAssistant: { enabled: true, setup: true },
				});

				const { toastBottomOffset } = useFloatingUiOffsets();

				expect(toastBottomOffset.value).toBe('0px');

				useNDVStore().setActiveNodeName('n0', 'other');

				expect(toastBottomOffset.value).toBe('90px'); // 42px button + 48px NDV offset
			},
		);
	});
});
