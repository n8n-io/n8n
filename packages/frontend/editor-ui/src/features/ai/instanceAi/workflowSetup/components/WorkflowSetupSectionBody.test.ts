import { createTestingPinia } from '@pinia/testing';
import { computed, nextTick, ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
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
	getCredentialTypeByName: vi.fn(),
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	getAllNodeTypes: vi.fn(),
}));

const renderedCredentials = vi.hoisted(() => [] as unknown[]);
const renderedOptionsOverrides = vi.hoisted(() => [] as Array<Record<string, boolean> | undefined>);
const workflowDocumentStoreRef = vi.hoisted(() => ({
	current: null as WorkflowDocumentStore | null,
}));

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node', 'hideCredentialServiceNameInLabel', 'hideEmptyCredentialSelect'],
		emits: ['credentialSelected'],
		template:
			"<button data-test-id=\"node-credentials\" :data-hide-credential-service-name-in-label=\"hideCredentialServiceNameInLabel ? 'true' : 'false'\" :data-hide-empty-credential-select=\"hideEmptyCredentialSelect ? 'true' : 'false'\" @click=\"$emit('credentialSelected', { properties: { credentials: { typeformApi: { id: 'cred-2' } } } })\"><slot name=\"label-postfix\" /></button>",
	},
}));

vi.mock('@/app/components/FreeAiCreditsCallout.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', async () => {
	const { defineComponent, h, inject } = await import('vue');
	const { WorkflowDocumentStoreKey } = await import('@/app/constants/injectionKeys');

	return {
		default: defineComponent({
			props: ['node', 'optionsOverrides'],
			emits: ['valueChanged', 'parameterBlur'],
			setup(props, { emit }) {
				const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);
				workflowDocumentStoreRef.current = workflowDocumentStore?.value ?? null;

				return () => {
					renderedCredentials.push((props.node as INodeUi | undefined)?.credentials);
					renderedOptionsOverrides.push(
						props.optionsOverrides as Record<string, boolean> | undefined,
					);

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

const renderComponent = createComponentRenderer(WorkflowSetupSectionBody, {
	pinia: createTestingPinia({ stubActions: false }),
});

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
		workflowId: computed(() => 'workflow-1'),
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
		renderedOptionsOverrides.length = 0;
		workflowDocumentStoreRef.current = null;
		credentialsStore.getCredentialById.mockReturnValue({ id: 'cred-1', name: 'Typeform account' });
		credentialsStore.getCredentialTypeByName.mockReturnValue({ displayName: 'Typeform API' });
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

		expect(getByTestId('node-credentials')).toHaveAttribute(
			'data-hide-credential-service-name-in-label',
			'true',
		);
		expect(getByTestId('node-credentials')).toHaveAttribute(
			'data-hide-empty-credential-select',
			'true',
		);

		const credentialsBeforeParameterChange = renderedCredentials.at(-1);
		await fireEvent.click(getByTestId('change-parameter'));
		await nextTick();

		expect(renderedCredentials.at(-1)).toBe(credentialsBeforeParameterChange);
		expect(renderedOptionsOverrides.at(-1)?.hideParameterOptions).toBe(true);
	});

	it('provides a scoped workflow document store with the display node', async () => {
		const section = makeWorkflowSetupSection({
			id: 'Typeform Trigger:typeformApi',
			targetNodeName: 'Typeform Trigger',
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

		expect(workflowDocumentStoreRef.current?.documentId).toBe(
			'workflow-1@Typeform Trigger:typeformApi',
		);
		expect(workflowDocumentStoreRef.current?.getNodeByName('Typeform Trigger')?.parameters).toEqual(
			{ formId: '' },
		);

		await fireEvent.click(getByTestId('change-parameter'));
		await nextTick();

		expect(workflowDocumentStoreRef.current?.getNodeByName('Typeform Trigger')?.parameters).toEqual(
			{ formId: 'form-1' },
		);
	});

	it('applies grouped credential selections to every underlying section', async () => {
		const section = makeWorkflowSetupSection({
			id: 'Typeform Trigger:typeformApi',
			targetNodeName: 'Typeform Trigger',
			credentialType: 'typeformApi',
			parameterNames: [],
			node: {
				id: 'typeform-trigger',
				name: 'Typeform Trigger',
				type: 'n8n-nodes-base.typeformTrigger',
				typeVersion: 1,
				parameters: {},
			},
		});
		const siblingSection = makeWorkflowSetupSection({
			id: 'Typeform Follow-up:typeformApi',
			targetNodeName: 'Typeform Follow-up',
			credentialType: 'typeformApi',
			parameterNames: ['formId'],
			node: {
				id: 'typeform-follow-up',
				name: 'Typeform Follow-up',
				type: 'n8n-nodes-base.typeformTrigger',
				typeVersion: 1,
				parameters: { formId: '' },
			},
		});
		const context = makeContext(section);
		workflowSetupContext.current = context;

		const { getByTestId } = renderComponent({
			props: { section, credentialSections: [section, siblingSection] },
		});

		await fireEvent.click(getByTestId('node-credentials'));

		expect(context.setCredential).toHaveBeenCalledWith(section, 'cred-2');
		expect(context.setCredential).toHaveBeenCalledWith(siblingSection, 'cred-2');
	});

	it('applies grouped parameter values to every underlying section', async () => {
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
		const siblingSection = makeWorkflowSetupSection({
			id: 'Typeform Follow-up:typeformApi',
			targetNodeName: 'Typeform Follow-up',
			credentialType: 'typeformApi',
			parameterNames: ['formId'],
			node: {
				id: 'typeform-follow-up',
				name: 'Typeform Follow-up',
				type: 'n8n-nodes-base.typeformTrigger',
				typeVersion: 1,
				parameters: { formId: '' },
			},
		});
		const context = makeContext(section);
		workflowSetupContext.current = context;

		const { getByTestId } = renderComponent({
			props: { section, parameterSections: [section, siblingSection] },
		});
		await nextTick();

		await fireEvent.click(getByTestId('change-parameter'));

		expect(context.setParameterValue).toHaveBeenCalledWith(section, 'formId', 'form-1');
		expect(context.setParameterValue).toHaveBeenCalledWith(siblingSection, 'formId', 'form-1');
	});
});
