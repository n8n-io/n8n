import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useToast } from '@n8n/composables/useToast';
import {
	useEngineV2FindingsDialog,
	type EngineCompatibilityReason,
} from '@n8n/frontend-module-engine-v2';
import { mockEngineV2Compatibility } from '@n8n/frontend-module-engine-v2/__tests__/mocks';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { shallowRef } from 'vue';

import EngineV2CompatibilityFindings from './EngineV2CompatibilityFindings.vue';

vi.mock('@n8n/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return { useToast: () => ({ showError, showMessage }) };
});

const WORKFLOW_ID = 'w1';

const nodeReason: EngineCompatibilityReason = {
	code: 'RETRY_ON_FAIL',
	kind: 'temporary',
	severity: 'blocking',
	nodeId: 'node-1',
	nodeName: 'HTTP Request',
	message: 'Engine v2 cannot retry a node yet.',
};

const renderComponent = createComponentRenderer(EngineV2CompatibilityFindings);

function setup({ readOnly = false } = {}) {
	const document = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	document.mergeSettings({ engineType: 'v2' });
	const result = renderComponent({
		props: { readOnly },
		global: { provide: { [WorkflowDocumentStoreKey as symbol]: shallowRef(document) } },
	});
	return { document, ...result };
}

async function openDialog(findByTestId: (id: string) => Promise<HTMLElement>) {
	useEngineV2FindingsDialog().open();
	return await findByTestId('engine-v2-compatibility-dialog');
}

describe('EngineV2CompatibilityFindings', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useSettingsStore().settings.activeModules = ['engine-v2'];
		mockEngineV2Compatibility({ reasons: [nodeReason] });
		vi.mocked(useToast().showError).mockClear();
		vi.mocked(useToast().showMessage).mockClear();
	});

	afterEach(() => useEngineV2FindingsDialog().close());

	it('selects and pans to the node from "Go to node", and closes', async () => {
		const emit = vi.spyOn(canvasEventBus, 'emit');
		const { findByTestId, queryByTestId } = setup();
		await openDialog(findByTestId);

		await fireEvent.click(await findByTestId('engine-v2-compatibility-go-to-node'));

		expect(emit).toHaveBeenCalledWith('nodes:select', { ids: ['node-1'], panIntoView: true });
		await waitFor(() =>
			expect(queryByTestId('engine-v2-compatibility-dialog')).not.toBeInTheDocument(),
		);
	});

	it('saves engine v1, shows a success toast and closes', async () => {
		const workflowsStore = useWorkflowsStore();
		const update = vi.spyOn(workflowsStore, 'updateWorkflowSetting').mockResolvedValue(
			// The store updates the document. Here the mock does it.
			{} as never,
		);
		const { findByTestId, queryByTestId } = setup();
		await openDialog(findByTestId);

		await fireEvent.click(await findByTestId('engine-v2-compatibility-switch-to-v1'));

		expect(update).toHaveBeenCalledWith(WORKFLOW_ID, 'engineType', 'v1');
		await waitFor(() =>
			expect(useToast().showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Switched to Engine v1', type: 'success' }),
			),
		);
		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
		await waitFor(() =>
			expect(queryByTestId('engine-v2-compatibility-dialog')).not.toBeInTheDocument(),
		);
	});

	it('shows an error and keeps the dialog open when the save fails', async () => {
		const error = new Error('Conflict');
		vi.spyOn(useWorkflowsStore(), 'updateWorkflowSetting').mockRejectedValue(error);
		const { findByTestId, getByTestId } = setup();
		await openDialog(findByTestId);

		await fireEvent.click(await findByTestId('engine-v2-compatibility-switch-to-v1'));

		await waitFor(() =>
			expect(useToast().showError).toHaveBeenCalledWith(error, "Couldn't switch to Engine v1"),
		);
		expect(getByTestId('engine-v2-compatibility-dialog')).toBeInTheDocument();
		expect(getByTestId('engine-v2-compatibility-switch-to-v1')).not.toBeDisabled();
	});

	it('turns off the switch on a read-only canvas', async () => {
		const { findByTestId } = setup({ readOnly: true });
		await openDialog(findByTestId);

		expect(await findByTestId('engine-v2-compatibility-switch-to-v1')).toBeDisabled();
	});

	it('closes when the last finding goes', async () => {
		const { document, findByTestId, queryByTestId } = setup();
		await openDialog(findByTestId);

		document.mergeSettings({ engineType: 'v1' });

		await waitFor(() =>
			expect(queryByTestId('engine-v2-compatibility-dialog')).not.toBeInTheDocument(),
		);
		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
	});

	it('closes when the canvas unmounts, so the next workflow does not open it', async () => {
		const { findByTestId, unmount } = setup();
		await openDialog(findByTestId);

		unmount();

		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
	});
});
