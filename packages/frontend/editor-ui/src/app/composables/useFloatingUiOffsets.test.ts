import { defaultSettings } from '@/__tests__/defaults';
import { useLogsStore } from '@/app/stores/logs.store';
import { injectNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useChatPanelStateStore } from '@/features/ai/assistant/chatPanelState.store';
import { setActivePinia } from 'pinia';
import { useFloatingUiOffsets } from './useFloatingUiOffsets';
import { reactive } from 'vue';
import { EDITABLE_CANVAS_VIEWS } from '@/app/constants';
import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';

vi.mock('@/features/ndv/shared/ndv.store', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/features/ndv/shared/ndv.store')>();
	return { ...original, injectNDVStore: vi.fn() };
});

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
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflow.id = 'test-workflow';
		const ndvStoreId = createWorkflowDocumentId(workflowsStore.workflowId);
		const workflowDocumentStore = useWorkflowDocumentStore(ndvStoreId);
		workflowDocumentStore.setNodes([createTestNode({ name: 'n0' })]);
		vi.mocked(injectNDVStore).mockReturnValue(useNDVStore(ndvStoreId));
	});

	describe('toastBottomOffset', () => {
		it('should account for the height of log view only when NDV is closed', () => {
			useLogsStore().setHeight(3);
			useNDVStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)).setActiveNodeName(
				'n0',
				'other',
			); // set NDV to be opened

			const { toastBottomOffset } = useFloatingUiOffsets();

			expect(toastBottomOffset.value).toBe('0px');

			useNDVStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)).unsetActiveNodeName(); // close NDV

			expect(toastBottomOffset.value).toBe('3px');
		});

		it('should not account for the height of log view when chat panel is open', () => {
			useLogsStore().setHeight(300);

			const { toastBottomOffset } = useFloatingUiOffsets();

			expect(toastBottomOffset.value).toBe('300px');

			useChatPanelStateStore().isOpen = true;

			expect(toastBottomOffset.value).toBe('0px');
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

				useNDVStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)).setActiveNodeName(
					'n0',
					'other',
				);

				expect(toastBottomOffset.value).toBe('58px'); // 42px button + 16px NDV offset
			},
		);
	});
});
