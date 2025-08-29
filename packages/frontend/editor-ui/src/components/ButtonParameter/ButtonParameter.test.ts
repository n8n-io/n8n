/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ButtonParameter, { type Props } from '@/components/ButtonParameter/ButtonParameter.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePostHog } from '@/stores/posthog.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import type { INodeProperties } from 'n8n-workflow';

vi.mock('@/stores/ndv.store');
vi.mock('@/stores/workflows.store');
vi.mock('@/stores/posthog.store');
vi.mock('@n8n/stores/useRootStore');
vi.mock('@/api/ai');
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
vi.mock('@/composables/useToast');

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
					action: {
						type: 'askAiCodeGeneration',
						target: 'targetParam',
					},
					hasInputField: true,
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

		vi.mocked(useWorkflowsStore).mockReturnValue({
			workflowObject: {
				getParentNodesByDepth: vi.fn().mockReturnValue([]),
			},
			getNodeByName: vi.fn().mockReturnValue({}),
		} as any);

		vi.mocked(usePostHog).mockReturnValue({
			isAiEnabled: vi.fn().mockReturnValue(true),
			getVariant: vi.fn().mockReturnValue('gpt-3.5-turbo-16k'),
		} as any);

		vi.mocked(useRootStore).mockReturnValue({
			versionCli: '1.0.0',
			pushRef: 'testPushRef',
		} as any);

		vi.mocked(useToast).mockReturnValue({
			showMessage: vi.fn(),
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
		await input.setValue('Test prompt');
		expect(wrapper.emitted('valueChanged')).toBeTruthy();
		expect(wrapper.emitted('valueChanged')![0][0]).toEqual({
			name: 'testPath.testParam',
			value: 'Test prompt',
		});
	});

	it('disables submit button when there is no execution data', async () => {
		vi.mocked(useNDVStore).mockReturnValue({
			ndvInputData: [],
		} as any);
		const wrapper = mountComponent();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});

	it('disables submit button when prompt is empty', async () => {
		const wrapper = mountComponent();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});

	it('enables submit button when there is execution data and prompt', async () => {
		const wrapper = mountComponent();
		await wrapper.find('textarea').setValue('Test prompt');
		expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
	});

	it('calls onSubmit when button is clicked', async () => {
		const wrapper = mountComponent();
		await wrapper.find('textarea').setValue('Test prompt');

		const submitButton = wrapper.find('button');
		expect(submitButton.attributes('disabled')).toBeUndefined();

		await submitButton.trigger('click');

		expect(useToast().showMessage).toHaveBeenCalled();
	});

	it('disables input and button when in read only mode', async () => {
		const wrapper = mountComponent({ isReadOnly: true });
		expect(wrapper.find('textarea').attributes('disabled')).toBeDefined();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});
});
