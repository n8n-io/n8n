import { createTestingPinia } from '@pinia/testing';
import { computed, nextTick, ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';
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
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	getAllNodeTypes: vi.fn(),
}));

const renderedCredentials = vi.hoisted(() => [] as unknown[]);
const workflowDocumentStoreRef = vi.hoisted(() => ({
	current: null as WorkflowDocumentStore | null,
}));
const nodeCredentialsMock = vi.hoisted(() => ({
	emitCredentialSelected: null as ((update: unknown) => void) | null,
	lastNodeProp: null as unknown,
	lastFieldLabel: undefined as string | undefined,
	lastSetupHint: undefined as unknown,
	lastSkipAutoSelect: undefined as boolean | undefined,
	lastPreferNewCredential: undefined as boolean | undefined,
	lastCredentialHelp: undefined as
		| ((credential: {
				credentialType: string;
				displayName: string;
				placeholderTitles?: string[];
		  }) => Promise<boolean>)
		| undefined,
}));
const instanceAiHandoffMock = vi.hoisted(() => ({
	startThread: vi.fn(),
}));
const parameterListMock = vi.hoisted(() => ({
	lastHiddenIssuesInputs: undefined as string[] | undefined,
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

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({
		isEnabled: { value: false },
		isNodeTypeVersionSupported: () => false,
		isCredentialTypeSupported: () => false,
	}),
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			props: [
				'node',
				'credentialsFieldLabel',
				'credentialSetupHint',
				'instanceAiCredentialHelp',
				'skipAutoSelect',
				'preferNewCredential',
			],
			emits: ['credentialSelected'],
			setup(props, { emit, slots }) {
				nodeCredentialsMock.emitCredentialSelected = (update) => emit('credentialSelected', update);
				nodeCredentialsMock.lastNodeProp = props.node;
				nodeCredentialsMock.lastFieldLabel = props.credentialsFieldLabel as string | undefined;
				nodeCredentialsMock.lastSetupHint = props.credentialSetupHint;
				nodeCredentialsMock.lastSkipAutoSelect = props.skipAutoSelect as boolean | undefined;
				nodeCredentialsMock.lastPreferNewCredential = props.preferNewCredential as
					| boolean
					| undefined;
				nodeCredentialsMock.lastCredentialHelp = props.instanceAiCredentialHelp as
					| ((credential: {
							credentialType: string;
							displayName: string;
							placeholderTitles?: string[];
					  }) => Promise<boolean>)
					| undefined;
				return () => h('div', { 'data-test-id': 'node-credentials' }, slots['label-postfix']?.());
			},
		}),
	};
});

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', async () => {
	const { computed } = await import('vue');
	return { useInstanceAiAvailable: () => computed(() => true) };
});

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', async (importOriginal) => {
	const original =
		await importOriginal<
			typeof import('@/features/ai/instanceAi/composables/useInstanceAiHandoff')
		>();
	return {
		...original,
		useInstanceAiHandoff: () => ({ startThread: instanceAiHandoffMock.startThread }),
	};
});

vi.mock('@/app/components/FreeAiCreditsCallout.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', async () => {
	const { defineComponent, h, inject } = await import('vue');
	const { WorkflowDocumentStoreKey } = await import('@/app/constants/injectionKeys');

	return {
		default: defineComponent({
			props: ['node', 'hiddenIssuesInputs'],
			emits: ['valueChanged', 'parameterBlur'],
			setup(props, { emit }) {
				const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);
				workflowDocumentStoreRef.current = workflowDocumentStore?.value ?? null;

				return () => {
					renderedCredentials.push((props.node as INodeUi | undefined)?.credentials);
					parameterListMock.lastHiddenIssuesInputs = props.hiddenIssuesInputs as string[];

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
		workflowDocumentStoreRef.current = null;
		nodeCredentialsMock.emitCredentialSelected = null;
		nodeCredentialsMock.lastNodeProp = null;
		nodeCredentialsMock.lastFieldLabel = undefined;
		nodeCredentialsMock.lastSetupHint = undefined;
		parameterListMock.lastHiddenIssuesInputs = undefined;
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

	it('reveals validation for setup parameters on mount so required fields show immediately', async () => {
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

		renderComponent({ props: { section } });
		await nextTick();

		// Empty => nothing hidden => the "required" issue is shown without interaction.
		expect(parameterListMock.lastHiddenIssuesInputs).toEqual([]);
	});

	// INS-361: the picker otherwise preselects the most recently updated
	// credential of the type, contradicting a user who asked for a new one.
	it('stops the picker preselecting an existing credential when the user asked for a new one', async () => {
		const section = makeWorkflowSetupSection({
			targetNodeName: 'Send Hello Message',
			credentialType: 'slackApi',
			preferNewCredential: true,
		});
		workflowSetupContext.current = makeContext(section);

		renderComponent({ props: { section } });
		await nextTick();

		expect(nodeCredentialsMock.lastSkipAutoSelect).toBe(true);
		expect(nodeCredentialsMock.lastPreferNewCredential).toBe(true);
	});

	it('leaves auto-select on for a credential the user did not ask to recreate', async () => {
		const section = makeWorkflowSetupSection({
			targetNodeName: 'Send Hello Message',
			credentialType: 'slackApi',
		});
		workflowSetupContext.current = makeContext(section);

		renderComponent({ props: { section } });
		await nextTick();

		expect(nodeCredentialsMock.lastSkipAutoSelect).toBe(false);
		expect(nodeCredentialsMock.lastPreferNewCredential).toBe(false);
	});

	it('labels the credential selector after the recipe service instead of the generic type', async () => {
		const section = makeWorkflowSetupSection({
			targetNodeName: 'HTTP Request',
			credentialType: 'httpTemplatedCustomAuth',
			setupHint: {
				suggestedName: 'fal.ai API Key',
				template: { headers: { Authorization: 'Key {{api_key}}' } },
				placeholders: [{ name: 'api_key', title: 'API key' }],
			},
		});
		workflowSetupContext.current = makeContext(section);

		renderComponent({ props: { section } });
		await nextTick();

		expect(nodeCredentialsMock.lastFieldLabel).toBe('fal.ai API Key credentials');
		// The recipe rides into NodeCredentials so a CREATE opens the credential
		// modal pre-filled on the guided simple view.
		expect(nodeCredentialsMock.lastSetupHint).toEqual(section.setupHint);
	});

	it('stores the AI Gateway-managed tag when selected in NodeCredentials', async () => {
		const section = makeWorkflowSetupSection({
			id: 'Gemini:googlePalmApi',
			targetNodeName: 'Gemini',
			credentialType: 'googlePalmApi',
		});
		workflowSetupContext.current = makeContext(section);

		renderComponent({ props: { section } });
		await nextTick();

		nodeCredentialsMock.emitCredentialSelected?.({
			name: 'Gemini',
			properties: {
				credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
			},
		});

		expect(workflowSetupContext.current.setCredential).toHaveBeenCalledWith(
			section,
			AI_GATEWAY_MANAGED_TAG,
		);
	});

	it('passes AI Gateway-managed credentials back to NodeCredentials from the setup tag', async () => {
		const section = makeWorkflowSetupSection({
			id: 'Gemini:googlePalmApi',
			targetNodeName: 'Gemini',
			credentialType: 'googlePalmApi',
		});
		const context = makeContext(section);
		context.credentialSelections = ref({
			Gemini: { googlePalmApi: AI_GATEWAY_MANAGED_TAG },
		});
		workflowSetupContext.current = context;

		renderComponent({ props: { section } });
		await nextTick();

		expect((nodeCredentialsMock.lastNodeProp as INodeUi).credentials).toEqual({
			googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
		});
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

	it('hands NodeCredentials a help handler that opens a new thread named after the recipe service', async () => {
		instanceAiHandoffMock.startThread.mockClear();
		const section = makeWorkflowSetupSection({
			credentialType: 'httpTemplatedCustomAuth',
			setupHint: {
				template: { headers: { Authorization: 'Key {{api_key}}' } },
				placeholders: [{ name: 'api_key', title: 'API key' }],
				suggestedName: 'fal.ai API Key',
			},
		});
		workflowSetupContext.current = makeContext(section);

		renderComponent({ props: { section } });
		await nextTick();

		const help = nodeCredentialsMock.lastCredentialHelp;
		expect(help).toBeTypeOf('function');

		// The modal reports the generic type name; the recipe's service name replaces
		// it, and the pre-filled form's labels turn the question into a natural
		// where-do-I-find ask — the paste-only steering rides invisibly in the
		// handoff context, not in the user-visible message.
		const shouldCloseModal = await help!({
			credentialType: 'httpTemplatedCustomAuth',
			displayName: 'Simplified Custom Auth',
			placeholderTitles: ['fal.ai API key'],
		});

		// New tab → the credential modal stays open.
		expect(shouldCloseModal).toBe(false);
		expect(instanceAiHandoffMock.startThread).toHaveBeenCalledWith(
			'project-1',
			'Where do I find the "fal.ai API key" for my "fal.ai API Key" credential?',
			{ source: 'credential_edit', origin: 'internal' },
			undefined,
			undefined,
			expect.objectContaining({
				newTab: true,
				context: expect.objectContaining({
					source: 'credential-modal',
					credential: expect.objectContaining({
						displayName: 'fal.ai API Key',
						placeholderTitles: ['fal.ai API key'],
					}),
				}),
			}),
		);
	});
});
