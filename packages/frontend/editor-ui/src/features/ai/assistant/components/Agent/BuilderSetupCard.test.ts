import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
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

vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		template: '<div data-test-id="credential-picker" />',
		props: ['appName', 'credentialType', 'selectedCredentialId'],
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

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		isNodeExecutable: vi.fn().mockReturnValue(false),
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
	return {
		id: 'node-1',
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		position: [0, 0],
		parameters: {},
		typeVersion: 1,
		...overrides,
	} as INodeUi;
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

	describe('footer visibility', () => {
		it('hides footer when single card and not executable', () => {
			const { queryByTestId } = render({ isComplete: false }, { totalCards: 1 });
			expect(queryByTestId('builder-setup-card-prev')).not.toBeInTheDocument();
		});
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
			expect(getByTestId('builder-setup-card-prev')).toBeInTheDocument();
			expect(getByTestId('builder-setup-card-prev').className).toContain('navArrowDisabled');
			expect(getByTestId('builder-setup-card-next')).toBeInTheDocument();
			expect(getByTestId('builder-setup-card-next').className).not.toContain('navArrowDisabled');
		});

		it('disables next arrow at last step but shows prev arrow enabled', () => {
			const { getByTestId } = render({}, { totalCards: 3, stepIndex: 2 });
			expect(getByTestId('builder-setup-card-next')).toBeInTheDocument();
			expect(getByTestId('builder-setup-card-next').className).toContain('navArrowDisabled');
			expect(getByTestId('builder-setup-card-prev')).toBeInTheDocument();
			expect(getByTestId('builder-setup-card-prev').className).not.toContain('navArrowDisabled');
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
			expect(getByText('2/4')).toBeInTheDocument();
		});
	});

	describe('credential section', () => {
		it('shows credential picker when showCredentialPicker is true', () => {
			const { getByTestId } = render({
				showCredentialPicker: true,
				credentialType: 'openAiApi',
				credentialDisplayName: 'OpenAI',
			});
			expect(getByTestId('credential-picker')).toBeInTheDocument();
		});

		it('hides credential picker when showCredentialPicker is false', () => {
			const { queryByTestId } = render({
				showCredentialPicker: false,
			});
			expect(queryByTestId('credential-picker')).not.toBeInTheDocument();
		});
	});
});
