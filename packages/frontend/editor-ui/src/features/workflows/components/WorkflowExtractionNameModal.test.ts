import { describe, it, expect } from 'vitest';
import WorkflowExtractionNameModal from '@/features/workflows/components/WorkflowExtractionNameModal.vue';
import { WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/app/constants';
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
	props: ['header', 'description'],
	template: `
		<div role="dialog">
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
		props = cloneDeep(DEFAULT_PROPS);
		vi.resetAllMocks();
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

		const input = getByRole('textbox');
		// The auto-select isn't working for the test, so this doesn't clear the input
		await userEvent.type(input, ' 2');
		await userEvent.click(getByTestId('submit-button'));

		expect(extractNodesIntoSubworkflow).toHaveBeenCalledWith(
			DEFAULT_PROPS.data.selection,
			DEFAULT_PROPS.data.subGraph,
			'My Sub-workflow 2',
		);
	});
});
