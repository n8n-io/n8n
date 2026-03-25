import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import BuilderSetupCard from './BuilderSetupCard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		template: '<span data-test-id="node-icon" />',
		props: ['nodeType', 'size'],
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		template: '<span data-test-id="credential-icon" />',
		props: ['credentialTypeName', 'size'],
	},
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		template: '<div data-test-id="node-credentials" />',
		props: ['node', 'overrideCredType', 'skipAutoSelect', 'hideIssues'],
	},
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: {
		template: '<div data-test-id="parameter-input-list" />',
		props: ['parameters', 'nodeValues', 'node'],
	},
}));

vi.mock('@/features/setupPanel/components/TriggerExecuteButton.vue', () => ({
	default: {
		template: '<button data-test-id="trigger-execute-button">Test step</button>',
		props: ['label', 'icon', 'disabled', 'loading', 'tooltipItems'],
	},
}));

vi.mock('@/features/setupPanel/components/WebhookUrlPreview.vue', () => ({
	default: {
		template: '<div data-test-id="webhook-url-preview" />',
		props: ['urls'],
	},
}));

vi.mock('@/features/setupPanel/composables/useTriggerExecution', () => ({
	useTriggerExecution: () => ({
		isExecuting: { value: false },
		isButtonDisabled: { value: false },
		label: { value: 'Test step' },
		buttonIcon: { value: 'play' },
		tooltipItems: { value: [] },
		execute: vi.fn(),
		isInListeningState: { value: false },
		listeningHint: { value: '' },
	}),
}));

vi.mock('@/features/setupPanel/composables/useWebhookUrls', () => ({
	useWebhookUrls: () => ({
		webhookUrls: { value: [] },
	}),
}));

const { mockIsNodeExecutable } = vi.hoisted(() => ({
	mockIsNodeExecutable: vi.fn().mockReturnValue(false),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		isNodeExecutable: mockIsNodeExecutable,
		updateNodesParameterIssues: vi.fn(),
	}),
}));

vi.mock('@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx', () => ({
	useExpressionResolveCtx: () => ({ value: undefined }),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		isCredentialTestPending: vi.fn().mockReturnValue(false),
	}),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		...overrides,
	}) as INodeUi;
}

function createState(overrides: Partial<NodeSetupState> = {}): NodeSetupState {
	return {
		node: createNode(),
		parameterIssues: {},
		isTrigger: false,
		isComplete: false,
		...overrides,
	};
}

const renderComponent = createComponentRenderer(BuilderSetupCard);

describe('BuilderSetupCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsNodeExecutable.mockReturnValue(false);
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
	});

	function render(
		stateOverrides: Partial<NodeSetupState> = {},
		props: Record<string, unknown> = {},
	) {
		return renderComponent({
			props: {
				state: createState(stateOverrides),
				stepIndex: 0,
				totalCards: 1,
				firstTriggerName: null,
				...props,
			},
		});
	}

	it('renders header with node name', () => {
		const { getByText } = render({ node: createNode({ name: 'HTTP Request' }) });
		expect(getByText('HTTP Request')).toBeInTheDocument();
	});

	it('shows check icon when complete', () => {
		const { getByTestId } = render({ isComplete: true });
		expect(getByTestId('builder-setup-card-check')).toBeInTheDocument();
	});

	it('does not show check icon when incomplete', () => {
		const { queryByTestId } = render({ isComplete: false });
		expect(queryByTestId('builder-setup-card-check')).not.toBeInTheDocument();
	});

	it('applies completed style when isComplete is true', () => {
		const { getByTestId } = render({ isComplete: true });
		const card = getByTestId('builder-setup-card');
		expect(card.className).toMatch(/completed/);
	});

	describe('navigation arrows', () => {
		it('hides arrows when single card', () => {
			const { queryByTestId } = render({ isComplete: true }, { totalCards: 1 });
			expect(queryByTestId('builder-setup-card-prev')).not.toBeInTheDocument();
			expect(queryByTestId('builder-setup-card-next')).not.toBeInTheDocument();
		});

		it('shows arrows when multiple cards', () => {
			const { getByTestId } = render({}, { totalCards: 3, stepIndex: 1 });
			expect(getByTestId('builder-setup-card-prev')).toBeInTheDocument();
			expect(getByTestId('builder-setup-card-next')).toBeInTheDocument();
		});

		it('disables prev arrow at first step but shows next arrow enabled', () => {
			const { getByTestId } = render({}, { totalCards: 3, stepIndex: 0 });
			expect(getByTestId('builder-setup-card-prev')).toBeDisabled();
			expect(getByTestId('builder-setup-card-next')).not.toBeDisabled();
		});

		it('disables next arrow at last step but shows prev arrow enabled', () => {
			const { getByTestId } = render({}, { totalCards: 3, stepIndex: 2 });
			expect(getByTestId('builder-setup-card-next')).toBeDisabled();
			expect(getByTestId('builder-setup-card-prev')).not.toBeDisabled();
		});
	});

	describe('continue button', () => {
		it('shows continue as primary on non-executable, multi-card, non-last', () => {
			const { getByTestId } = render({ isComplete: false }, { totalCards: 3, stepIndex: 0 });
			const continueButton = getByTestId('builder-setup-card-continue');
			expect(continueButton).toBeInTheDocument();
		});

		it('disables continue when credentials required but not selected', () => {
			const { getByTestId } = render(
				{ isComplete: false, credentialType: 'openAiApi', showCredentialPicker: true },
				{ totalCards: 3, stepIndex: 0 },
			);
			const continueButton = getByTestId('builder-setup-card-continue') as HTMLButtonElement;
			expect(continueButton.disabled).toBe(true);
		});

		it('enables continue when credentials are selected', () => {
			const { getByTestId } = render(
				{
					isComplete: false,
					credentialType: 'openAiApi',
					selectedCredentialId: 'cred-1',
					showCredentialPicker: true,
				},
				{ totalCards: 3, stepIndex: 0 },
			);
			const continueButton = getByTestId('builder-setup-card-continue') as HTMLButtonElement;
			expect(continueButton.disabled).toBe(false);
		});

		it('hides continue on last card', () => {
			const { queryByTestId } = render({ isComplete: false }, { totalCards: 3, stepIndex: 2 });
			expect(queryByTestId('builder-setup-card-continue')).not.toBeInTheDocument();
		});
	});

	describe('step indicator', () => {
		it('shows step indicator in footer', () => {
			const { getByText } = render({}, { totalCards: 4, stepIndex: 1 });
			expect(getByText('2 of 4')).toBeInTheDocument();
		});
	});

	describe('execute button', () => {
		it('does not show execute button for tool nodes', () => {
			mockIsNodeExecutable.mockReturnValue(true);
			const nodeTypesStore = useNodeTypesStore();
			// @ts-expect-error -- pinia test store allows overriding computed
			nodeTypesStore.isToolNode = () => true;

			const { queryByTestId } = render(
				{ node: createNode({ type: '@n8n/n8n-nodes-langchain.chatTool' }) },
				{ totalCards: 2, stepIndex: 0 },
			);
			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});
	});

	describe('credential section', () => {
		it('shows credential section when showCredentialPicker is true', () => {
			const { getByTestId } = render({
				showCredentialPicker: true,
				credentialType: 'openAiApi',
				credentialDisplayName: 'OpenAI',
			});
			expect(getByTestId('node-credentials')).toBeInTheDocument();
		});

		it('hides credential section when showCredentialPicker is false', () => {
			const { queryByTestId } = render({
				showCredentialPicker: false,
			});
			expect(queryByTestId('node-credentials')).not.toBeInTheDocument();
		});
	});
});
