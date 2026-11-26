import { describe, it, expect } from 'vitest';
import WorkflowExtractionNameModal from '@/features/workflows/components/WorkflowExtractionNameModal.vue';
import { WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { INodeUi } from '@/Interface';
import type { ExtractableSubgraphData } from 'n8n-workflow';
import cloneDeep from 'lodash/cloneDeep';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';

const extractNodesIntoSubworkflow = vi.fn();
vi.mock('@/app/composables/useWorkflowExtraction', () => {
	return {
		useWorkflowExtraction: () => ({
			extractNodesIntoSubworkflow,
		}),
	};
});

const DialogStub = {
	props: ['open', 'header', 'description'],
	emits: ['openAutoFocus', 'update:open'],
	mounted() {
		if (this.open) this.$emit('openAutoFocus', new FocusEvent('focus'));
	},
	template: `
		<div v-if="open" role="dialog">
			<h2 v-if="header">{{ header }}</h2>
			<p v-if="description">{{ description }}</p>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const global = {
	stubs: {
		Dialog: DialogStub,
		DialogHeader: dialogPartStub,
		DialogTitle: dialogPartStub,
		DialogFooter: dialogPartStub,
		DialogDescription: dialogPartStub,
	},
};

const renderModal = createComponentRenderer(WorkflowExtractionNameModal);
let pinia: ReturnType<typeof createTestingPinia>;

const DEFAULT_PROPS = {
	modalName: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	data: {
		subGraph: Symbol() as unknown as INodeUi[],
		selection: Symbol() as ExtractableSubgraphData,
	},
};

describe('WorkflowExtractionNameModal.vue', () => {
	let props = DEFAULT_PROPS;
	beforeEach(() => {
		pinia = createTestingPinia();
		useUIStore().modalStateById[WORKFLOW_EXTRACTION_NAME_MODAL_KEY] = { open: true };
		props = cloneDeep(DEFAULT_PROPS);
		vi.resetAllMocks();
	});

	it('hides the name field while the dialog is closed', () => {
		useUIStore().modalStateById[WORKFLOW_EXTRACTION_NAME_MODAL_KEY] = { open: false };
		const { queryByRole } = renderModal({
			props,
			global,
			pinia,
		});

		expect(queryByRole('textbox')).not.toBeInTheDocument();
	});

	it('emits "close" event when the cancel button is clicked', async () => {
		const { getByTestId } = renderModal({
			props,
			global,
			pinia,
		});
		await userEvent.click(getByTestId('cancel-button'));
		expect(extractNodesIntoSubworkflow).not.toHaveBeenCalled();
	});

	it('emits "submit" event with the correct name when the form is submitted', async () => {
		const { getByTestId, getByRole } = renderModal({
			props,
			global,
			pinia,
		});

		const input = getByRole('textbox') as HTMLInputElement;
		expect(input).toHaveValue('My Sub-workflow');
		// Opening the dialog selects the default name. user-event's click then
		// moves the caret, so replace the value after checking the selection.
		expect({ start: input.selectionStart, end: input.selectionEnd }).toEqual({
			start: 0,
			end: 'My Sub-workflow'.length,
		});
		await userEvent.clear(input);
		await userEvent.type(input, 'Renamed');
		await userEvent.click(getByTestId('submit-button'));

		expect(extractNodesIntoSubworkflow).toHaveBeenCalledWith(
			DEFAULT_PROPS.data.selection,
			DEFAULT_PROPS.data.subGraph,
			'Renamed',
		);
	});
});
