import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import WorkflowExtractionNameModal from '@/components/WorkflowExtractionNameModal.vue';
import { WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/constants';
import type { INodeUi } from '@/Interface';
import type { ExtractableSubgraphData, IConnections, INodeConnections } from 'n8n-workflow';
import { cloneDeep } from 'lodash-es';

const DEFAULT_PROPS = {
	modalName: WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	data: {
		subGraph: [{ _marker: Symbol() } as unknown as INodeUi],
		selection: {} as ExtractableSubgraphData,
		connections: { _marker: Symbol() as unknown as INodeConnections } as IConnections,
	},
};

describe('WorkflowExtractionNameModal.vue', () => {
	let props = DEFAULT_PROPS;
	beforeEach(() => {
		props = cloneDeep(DEFAULT_PROPS);
	});
	it('renders the modal with the correct title', () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		expect(wrapper.find('.modal-title').text()).toBe('Extract Workflow Name');
	});

	it('emits "close" event when the cancel button is clicked', async () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		await wrapper.find('.cancel-button').trigger('click');
		expect(wrapper.emitted('close')).toBeTruthy();
	});

	it('emits "submit" event with the correct name when the form is submitted', async () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		const input = wrapper.find('input[name="workflowName"]');
		await input.setValue('Test Workflow');
		await wrapper.find('.submit-button').trigger('click');

		expect(wrapper.emitted('submit')).toBeTruthy();
		expect(wrapper.emitted('submit')?.[0]).toEqual(['Test Workflow']);
	});

	it('does not render the modal when "visible" prop is false', () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		expect(wrapper.find('.modal').exists()).toBe(false);
	});

	it('validates input and disables submit button if input is empty', async () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		const input = wrapper.find('input[name="workflowName"]');
		await input.setValue('');
		const submitButton = wrapper.find('.submit-button');

		expect(submitButton.attributes('disabled')).toBe('disabled');
	});

	it('enables submit button when input is valid', async () => {
		const wrapper = mount(WorkflowExtractionNameModal, {
			props,
		});

		const input = wrapper.find('input[name="workflowName"]');
		await input.setValue('Valid Workflow Name');
		const submitButton = wrapper.find('.submit-button');

		expect(submitButton.attributes('disabled')).toBeUndefined();
	});
});
