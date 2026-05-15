import { computed, nextTick, ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type { WorkflowSetupSection } from '../workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

const credentialsStore = vi.hoisted(() => ({
	getCredentialById: vi.fn(),
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	getAllNodeTypes: vi.fn(),
}));

const renderedCredentials = vi.hoisted(() => [] as unknown[]);

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	default: () => ({ variablesAsObject: {} }),
	useEnvironmentsStore: () => ({ variablesAsObject: {} }),
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node'],
		template: '<div data-test-id="node-credentials"><slot name="label-postfix" /></div>',
	},
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', async () => {
	const { defineComponent, h } = await import('vue');

	return {
		default: defineComponent({
			props: ['node'],
			emits: ['valueChanged', 'parameterBlur'],
			setup(props, { emit }) {
				return () => {
					renderedCredentials.push((props.node as INodeUi | undefined)?.credentials);

					return h(
						'button',
						{
							'data-test-id': 'change-parameter',
							onClick: () =>
								emit('valueChanged', {
									name: 'parameters.formId',
									value: 'form-1',
								}),
						},
						'Change parameter',
					);
				};
			},
		}),
	};
});

const renderComponent = createComponentRenderer(WorkflowSetupSectionBody);

function makeContext(section: WorkflowSetupSection): WorkflowSetupContext {
	const parameters = ref({ formId: '' });

	return {
		sections: computed(() => [section]),
		steps: computed(() => [{ kind: 'section', section }]),
		currentStepIndex: ref(0),
		activeStep: computed(() => ({ kind: 'section', section })),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({ [section.targetNodeName]: { typeformApi: 'cred-1' } }),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => 'project-1'),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn((_setupSection, parameterName: string, value: unknown) => {
			parameters.value = { ...parameters.value, [parameterName]: value };
		}),
		getDisplayNode: (setupSection) =>
			({
				...setupSection.node,
				parameters: parameters.value,
			}) as INodeUi,
		isSectionComplete: () => false,
		isCredentialTestFailed: () => false,
		isSectionSkipped: () => false,
		isStepComplete: () => false,
		isStepSkipped: () => false,
		isStepHandled: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

describe('WorkflowSetupSectionBody', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		renderedCredentials.length = 0;
		credentialsStore.getCredentialById.mockReturnValue({ id: 'cred-1', name: 'Typeform account' });
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.typeformTrigger',
			properties: [
				{
					displayName: 'Form Name or ID',
					name: 'formId',
					type: 'options',
					default: '',
				},
			],
		});
		nodeTypesStore.getAllNodeTypes.mockReturnValue({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		});
	});

	it('keeps the synthetic credentials object stable when parameter values change', async () => {
		const section = makeWorkflowSetupSection({
			id: 'Typeform Trigger:typeformApi',
			targetNodeName: 'Typeform Trigger',
			credentialType: 'typeformApi',
			parameterNames: ['formId'],
			node: {
				id: 'typeform-trigger',
				name: 'Typeform Trigger',
				type: 'n8n-nodes-base.typeformTrigger',
				typeVersion: 1,
				parameters: { formId: '' },
			},
		});
		workflowSetupContext.current = makeContext(section);

		const { getByTestId } = renderComponent({ props: { section } });
		await nextTick();

		const credentialsBeforeParameterChange = renderedCredentials.at(-1);
		await fireEvent.click(getByTestId('change-parameter'));
		await nextTick();

		expect(renderedCredentials.at(-1)).toBe(credentialsBeforeParameterChange);
	});
});
