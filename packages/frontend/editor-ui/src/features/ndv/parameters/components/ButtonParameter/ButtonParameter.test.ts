/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ButtonParameter, { type Props } from './ButtonParameter.vue';
import { useNDVStore, injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import type { INodeProperties } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { getTooltip } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';

const editorContext = vi.hoisted(() => ({ askAi: { value: true } }));

vi.mock('@/features/ndv/shared/ndv.store');
vi.mock('@/app/stores/workflows.store');
vi.mock('@/app/stores/posthog.store');
vi.mock('@n8n/stores/useRootStore');
vi.mock('@/features/ai/assistant/assistant.api');
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
vi.mock('@n8n/composables/useToast');
vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => ({
		aiAssistant: { value: true },
		aiBuilder: { value: true },
		askAi: editorContext.askAi,
		readOnly: { value: false },
	}),
}));
vi.mock('../../utils/buttonParameter.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../utils/buttonParameter.utils')>()),
	generateCodeForAiTransform: vi.fn().mockResolvedValue({
		name: 'testPath.targetParam',
		value: 'generated code',
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
		editorContext.askAi.value = true;
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

		vi.mocked(useWorkflowsStore).mockReturnValue({
			workflowId: 'test-workflow-id',
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
		expect(wrapper.find('button').attributes('aria-disabled')).toBe('true');
	});

	it('disables submit button when prompt is empty', async () => {
		const wrapper = mountComponent();
		expect(wrapper.find('button').attributes('aria-disabled')).toBe('true');
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
		expect(wrapper.find('button').attributes('aria-disabled')).toBe('true');
		expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
	});

	it.each([
		{ reason: "You can't generate code in read-only mode", isReadOnly: true },
		{ reason: 'AI code generation is unavailable in this editor', aiAvailable: false },
		{ reason: 'Shorten the prompt to 3 characters or fewer', maxLength: 3 },
		{ reason: 'First enter a prompt above before generating code', value: '' },
		{
			reason:
				'You can generate code once this node has incoming input data (from a node earlier in your workflow)',
			hasExecutionData: false,
		},
	])('explains the disabled action: $reason', async (state) => {
		const user = userEvent.setup();
		editorContext.askAi.value = state.aiAvailable ?? true;
		if (state.hasExecutionData === false) {
			injectNDVStore().value.ndvInputData = [];
		}
		const { getByRole, emitted } = createComponentRenderer(ButtonParameter)({
			pinia: createTestingPinia(),
			props: {
				...defaultProps,
				value: state.value ?? 'Test prompt',
				isReadOnly: state.isReadOnly,
				parameter: {
					...defaultProps.parameter,
					typeOptions: {
						buttonConfig: {
							...defaultProps.parameter.typeOptions?.buttonConfig,
							inputFieldMaxLength: state.maxLength,
						},
					},
				},
			},
		});
		const button = getByRole('button', { name: 'Generate' });
		expect(button).toHaveAttribute('aria-disabled', 'true');
		expect(button).not.toBeDisabled();
		button.focus();
		await waitFor(() => expect(getTooltip()).toHaveTextContent(state.reason));
		expect(button).toHaveAccessibleDescription(state.reason);
		await user.keyboard('{Enter} ');
		await user.click(button);
		expect(emitted('valueChanged')).toBeUndefined();
	});
});
