/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ButtonParameter, { type Props } from './ButtonParameter.vue';
import { useNDVStore, injectNDVStore } from '@/features/ndv/shared/ndv.store';
import type { INodeProperties } from 'n8n-workflow';

vi.mock('@/features/ndv/shared/ndv.store');
vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	const { shallowRef } = await import('vue');
	const mockStore = {
		getParentNodesByDepth: vi.fn().mockReturnValue([]),
		getNodeByName: vi.fn().mockReturnValue(null),
	};
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() => mockStore),
		createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
		injectWorkflowDocumentStore: vi.fn(() => shallowRef(mockStore)),
	};
});
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: vi.fn().mockReturnValue('Mocked Text'),
		nodeText: () => ({
			inputLabelDisplayName: vi.fn().mockReturnValue('Mocked Display Name'),
			inputLabelDescription: vi.fn().mockReturnValue('Mocked Description'),
		}),
	}),
}));

describe('ButtonParameter', () => {
	const defaultProps: Props = {
		parameter: {
			name: 'testParam',
			displayName: 'Test Parameter',
			type: 'string',
			default: '',
			typeOptions: {
				buttonConfig: {
					label: 'Generate',
					action: 'testAction',
					hasInputField: true,
					inputFieldMaxLength: 10,
				},
			},
		} as INodeProperties,
		value: '',
		isReadOnly: false,
		path: 'testPath',
	};

	beforeEach(() => {
		vi.mocked(useNDVStore).mockReturnValue({
			ndvInputData: [{}],
			activeNode: { name: 'TestNode', parameters: {} },
			isDraggableDragging: false,
		} as any);

		vi.mocked(injectNDVStore).mockReturnValue({
			value: {
				ndvInputData: [{}],
				ndvInputDataWithPinnedData: [{}],
				activeNode: { name: 'TestNode', parameters: {} },
				isDraggableDragging: false,
				pushRef: 'testPushRef',
			},
		} as any);
	});

	const mountComponent = (props: Partial<Props> = {}) => {
		return mount(ButtonParameter, {
			props: { ...defaultProps, ...props },
			global: {
				plugins: [createTestingPinia()],
			},
		});
	};

	it('renders correctly', () => {
		const wrapper = mountComponent();
		expect(wrapper.find('textarea').exists()).toBe(true);
		expect(wrapper.find('button').text()).toBe('Generate');
	});

	it('emits valueChanged event on input', async () => {
		const wrapper = mountComponent();
		const input = wrapper.find('textarea');
		await input.setValue('Test');
		expect(wrapper.emitted('valueChanged')).toBeTruthy();
		expect(wrapper.emitted('valueChanged')![0][0]).toEqual({
			name: 'testPath.testParam',
			value: 'Test',
		});
	});

	it('disables the submit button until a prompt is entered', async () => {
		const wrapper = mountComponent();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();

		await wrapper.find('textarea').setValue('Test');
		expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
	});

	it('disables submit button when the prompt exceeds the max length', async () => {
		const wrapper = mountComponent();
		// `setValue` bypasses the textarea's own maxlength, which is what lets this
		// guard be reached at all.
		await wrapper.find('textarea').setValue('This prompt is far too long');
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});

	it('disables input and button when in read only mode', async () => {
		const wrapper = mountComponent({ isReadOnly: true });
		expect(wrapper.find('textarea').attributes('disabled')).toBeDefined();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});
});
