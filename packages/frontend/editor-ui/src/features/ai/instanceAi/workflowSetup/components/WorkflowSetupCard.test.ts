import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import { makeWorkflowSetupCard } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type { WorkflowSetupCard as WorkflowSetupCardType } from '../workflowSetup.types';

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

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node', 'overrideCredType', 'projectId', 'standalone', 'hideIssues'],
		template: '<div data-test-id="node-credentials" />',
	},
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: {
		props: [
			'parameters',
			'nodeValues',
			'node',
			'path',
			'hideDelete',
			'hiddenIssuesInputs',
			'removeFirstParameterMargin',
			'removeLastParameterMargin',
			'optionsOverrides',
		],
		template: '<div data-test-id="parameter-input-list" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowSetupCard);

function makeContext(card: WorkflowSetupCardType): WorkflowSetupContext {
	return {
		cards: computed(() => [card]),
		currentStepIndex: ref(0),
		activeCard: computed(() => card),
		hasOtherUnhandledCards: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (setupCard) => setupCard.node as INodeUi,
		isCardComplete: () => false,
		isCredentialTestFailed: () => false,
		isCardSkipped: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentCard: vi.fn(async () => {}),
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

	it('shows the node name when the card includes parameters and credentials', () => {
		const card = makeWorkflowSetupCard({
			credentialType: 'httpHeaderAuth',
			parameterNames: ['url'],
		});
		workflowSetupContext.current = makeContext(card);

		const { getByText, getByTestId, queryByText, queryByTestId } = renderComponent();

		expect(getByText('HTTP Request')).toBeInTheDocument();
		expect(queryByText('Set up Header Auth')).not.toBeInTheDocument();
		expect(getByTestId('node-icon')).toBeInTheDocument();
		expect(queryByTestId('credential-icon')).not.toBeInTheDocument();
	});

	it('shows the credential app name when the card only needs credentials', () => {
		const card = makeWorkflowSetupCard({
			credentialType: 'httpHeaderAuth',
		});
		workflowSetupContext.current = makeContext(card);

		const { getByText, getByTestId, queryByText, queryByTestId } = renderComponent();

		expect(getByText('Set up Header Auth')).toBeInTheDocument();
		expect(queryByText('HTTP Request')).not.toBeInTheDocument();
		expect(getByTestId('credential-icon')).toBeInTheDocument();
		expect(queryByTestId('node-icon')).not.toBeInTheDocument();
	});
});
