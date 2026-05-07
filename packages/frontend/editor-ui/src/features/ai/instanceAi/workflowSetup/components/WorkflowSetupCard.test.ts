import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type { WorkflowSetupSection } from '../workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

const credentialsStore = vi.hoisted(() => ({
	getCredentialTypeByName: vi.fn(),
	getCredentialById: vi.fn(),
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	communityNodeType: vi.fn(() => null),
}));

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (key === 'instanceAi.credential.setupTitle' && opts?.interpolate?.name) {
				return `Set up ${opts.interpolate.name}`;
			}
			return key;
		},
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	default: () => ({ variablesAsObject: {} }),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'size'],
		template: '<span data-test-id="node-icon" />',
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		props: ['credentialTypeName', 'size'],
		template: '<span data-test-id="credential-icon" />',
	},
}));

vi.mock('./WorkflowSetupSectionBody.vue', () => ({
	default: {
		props: ['section'],
		template: '<div data-test-id="workflow-setup-section-body" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowSetupCard);

function makeContext(section: WorkflowSetupSection): WorkflowSetupContext {
	return {
		sections: computed(() => [section]),
		steps: computed(() => [{ kind: 'section', section }]),
		currentStepIndex: ref(0),
		activeStep: computed(() => ({ kind: 'section', section })),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (setupSection) => setupSection.node as INodeUi,
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

describe('WorkflowSetupCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialsStore.getCredentialTypeByName.mockReturnValue({ displayName: 'Header Auth' });
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			properties: [{ displayName: 'URL', name: 'url', type: 'string', default: '' }],
		});
	});

	it('shows the node name when the section includes parameters and credentials', () => {
		const section = makeWorkflowSetupSection({
			credentialType: 'httpHeaderAuth',
			parameterNames: ['url'],
		});
		workflowSetupContext.current = makeContext(section);

		const { getByText, getByTestId, queryByText, queryByTestId } = renderComponent({
			props: { section },
		});

		expect(getByText('HTTP Request')).toBeInTheDocument();
		expect(queryByText('Set up Header Auth')).not.toBeInTheDocument();
		expect(getByTestId('node-icon')).toBeInTheDocument();
		expect(queryByTestId('credential-icon')).not.toBeInTheDocument();
	});

	it('shows the credential app name when the section only needs credentials', () => {
		const section = makeWorkflowSetupSection({
			credentialType: 'httpHeaderAuth',
		});
		workflowSetupContext.current = makeContext(section);

		const { getByText, getByTestId, queryByText, queryByTestId } = renderComponent({
			props: { section },
		});

		expect(getByText('Set up Header Auth')).toBeInTheDocument();
		expect(queryByText('HTTP Request')).not.toBeInTheDocument();
		expect(getByTestId('credential-icon')).toBeInTheDocument();
		expect(queryByTestId('node-icon')).not.toBeInTheDocument();
	});
});
