import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiEmptyView from '../InstanceAiEmptyView.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { SidebarStateKey } from '../instanceAiLayout';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { FrontendModuleSettings } from '@n8n/api-types';

const PERSONAL_PROJECT_ID = 'personal-project-id';

const {
	experimentMocks,
	promptSuggestionsV2,
	promptSuggestionsV2Component,
	personalizedPromptSuggestionsComponent,
	workflowPreviewSuggestions,
	workflowPreviewSuggestionsComponent,
	cloudPlanStoreMock,
	appSettingsStoreMock,
	replaceMock,
	showErrorMock,
} = vi.hoisted(() => ({
	experimentMocks: {
		proactiveAgentEnabled: { value: false },
		promptSuggestionsV2Enabled: { value: false },
		workflowPreviewEnabled: { value: false },
		splitBelowInputVariant: { value: false },
		personalizedPromptVariant: { value: undefined as string | undefined },
		personalizedPromptFormat: { value: null as 'cards' | 'list' | null },
		personalizedPromptTreatmentEnabled: { value: false },
		personalizedPromptProfileOverride: {
			value: null as
				| null
				| { kind: 'fallback' }
				| { kind: 'segment'; role: string; useCase: string; segmentKey: string },
		},
		resolvePersonalizedPromptSuggestions: vi.fn(
			({ metadataLoadState, fallbackSuggestions, format, profileOverride }) => ({
				suggestions:
					metadataLoadState === 'loaded'
						? Array.from({ length: 4 }, (_, index) => ({
								id: `personalized-${index + 1}`,
								shortTitle: `Personalized prompt ${index + 1}`,
								description: `Personalized prompt description ${index + 1}`,
								builderPrompt: `Personalized builder prompt ${index + 1}`,
							}))
						: fallbackSuggestions,
				fallbackSuggestions,
				showSeeMore: metadataLoadState === 'loaded',
				telemetryPayload: {
					suggestion_catalog_version: 'v4-personalized',
					suggestion_format: format,
					suggestion_source: metadataLoadState === 'loaded' ? 'matrix' : 'v2_top_used_fallback',
					metadata_load_state: metadataLoadState,
					profile_override: profileOverride ? true : undefined,
				},
			}),
		),
	},
	cloudPlanStoreMock: {
		state: { initialized: false },
		currentUserCloudInfo: null as null | { information?: Record<string, string | string[]> },
	},
	appSettingsStoreMock: {
		isCloudDeployment: false,
	},
	promptSuggestionsV2: Array.from({ length: 12 }, (_, index) => ({
		type: 'prompt',
		id: `v2-suggestion-${index + 1}`,
		icon: 'bot',
		labelKey: 'instanceAi.emptyState.suggestions.buildAgent.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildAgent.prompt',
	})),
	promptSuggestionsV2Component: { name: 'InstanceAiPromptSuggestionsV2Stub' },
	workflowPreviewSuggestions: Array.from({ length: 4 }, (_, index) => ({
		type: 'prompt',
		id: `wp-suggestion-${index + 1}`,
		icon: 'workflow',
		labelKey: 'instanceAi.emptyState.suggestions.buildWorkflow.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildWorkflow.prompt',
	})),
	workflowPreviewSuggestionsComponent: { name: 'WorkflowPreviewSuggestionsStub' },
	personalizedPromptSuggestionsComponent: { name: 'InstanceAiPersonalizedPromptSuggestionsStub' },
	replaceMock: vi.fn(),
	showErrorMock: vi.fn(),
}));

vi.mock('@/experiments/instanceAiProactiveAgent', () => ({
	useInstanceAiProactiveAgentExperiment: () => ({
		isFeatureEnabled: experimentMocks.proactiveAgentEnabled,
	}),
	InstanceAiProactiveStarterMessage: {
		name: 'InstanceAiProactiveStarterMessageStub',
		template: '<div data-test-id="instance-ai-proactive-starter">starter</div>',
	},
}));

vi.mock('@/experiments/instanceAiPromptSuggestionsV2', () => ({
	useInstanceAiPromptSuggestionsV2Experiment: () => ({
		isFeatureEnabled: experimentMocks.promptSuggestionsV2Enabled,
	}),
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2: promptSuggestionsV2,
	INSTANCE_AI_PROMPT_SUGGESTIONS_V2_VERSION: 'v2',
	InstanceAiPromptSuggestionsV2: promptSuggestionsV2Component,
}));

vi.mock('@/experiments/instanceAiSplitEmptyState', async () => {
	const { computed, h } = await import('vue');
	type VueSetupContext = {
		emit: (event: string, ...args: unknown[]) => void;
		slots: Record<string, (() => import('vue').VNode[]) | undefined>;
	};
	return {
		useInstanceAiSplitEmptyStateExperiment: () => ({
			isVariantEnabled: computed(() => experimentMocks.splitBelowInputVariant.value),
		}),
		INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION: 'v2-cycling-preview',
		InstanceAiSplitEmptyState: {
			name: 'InstanceAiSplitEmptyStateStub',
			props: {
				projectId: { type: String, required: false },
				disabled: { type: Boolean, required: false },
				writing: { type: Boolean, required: false },
			},
			emits: ['submit-suggestion', 'insert-suggestion', 'example-change'],
			setup(_props: Record<string, unknown>, { emit, slots }: VueSetupContext) {
				return () =>
					h('div', { 'data-test-id': 'instance-ai-split-empty-state' }, [
						...(slots.header?.() ?? []),
						...(slots.input?.() ?? []),
						h(
							'button',
							{
								'data-test-id': 'instance-ai-split-stub-submit',
								onClick: () =>
									emit('submit-suggestion', {
										promptKey:
											'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.prompt',
										suggestionId: 'score-my-leads',
										suggestionKind: 'quick_example',
										position: 1,
									}),
							},
							'submit',
						),
						h(
							'button',
							{
								'data-test-id': 'instance-ai-split-stub-example-change',
								onClick: () =>
									emit(
										'example-change',
										0,
										'experiments.instanceAiWorkflowPreviewSuggestions.suggestions.scoreMyLeads.prompt',
									),
							},
							'example-change',
						),
					]);
			},
		},
	};
});
vi.mock('@/experiments/instanceAiPersonalizedPromptSuggestions', () => ({
	useInstanceAiPersonalizedPromptSuggestionsExperiment: () => ({
		currentVariant: experimentMocks.personalizedPromptVariant,
		suggestionFormat: experimentMocks.personalizedPromptFormat,
		isTreatmentVariant: experimentMocks.personalizedPromptTreatmentEnabled,
	}),
	usePersonalizedPromptProfileOverride: () => experimentMocks.personalizedPromptProfileOverride,
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_VERSION: 'v4-personalized',
	InstanceAiPersonalizedPromptSuggestions: personalizedPromptSuggestionsComponent,
	getTopUsedV2FallbackSuggestions: () => [
		{
			id: 'whatsapp-support-agent',
			shortTitle: 'WhatsApp support agent',
			description: 'WhatsApp support agent prompt',
			builderPrompt: 'WhatsApp support agent prompt',
		},
		{
			id: 'process-invoices',
			shortTitle: 'Process invoices',
			description: 'Process invoices prompt',
			builderPrompt: 'Process invoices prompt',
		},
		{
			id: 'schedule-social-posts',
			shortTitle: 'Schedule social posts',
			description: 'Schedule social posts prompt',
			builderPrompt: 'Schedule social posts prompt',
		},
		{
			id: 'qualify-inbound-leads',
			shortTitle: 'Qualify inbound leads',
			description: 'Qualify inbound leads prompt',
			builderPrompt: 'Qualify inbound leads prompt',
		},
	],
	resolvePersonalizedPromptSuggestions: experimentMocks.resolvePersonalizedPromptSuggestions,
}));

vi.mock('@/experiments/instanceAiWorkflowPreviewSuggestions', () => ({
	useInstanceAiWorkflowPreviewSuggestionsExperiment: () => ({
		isFeatureEnabled: experimentMocks.workflowPreviewEnabled,
	}),
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS: workflowPreviewSuggestions,
	INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_VERSION: 'v3-workflow-preview',
	WorkflowPreviewSuggestions: workflowPreviewSuggestionsComponent,
	WorkflowPreviewCanvas: { name: 'WorkflowPreviewCanvasStub', template: '<div />' },
	getPreviewWorkflow: () => null,
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: () => cloudPlanStoreMock,
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => appSettingsStoreMock,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'test-push-ref' }),
}));

vi.mock('uuid', () => ({
	v4: () => 'thread-placeholder',
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		suggestionsComponent: { type: [Object, Function], required: false },
		suggestionsComponentProps: { type: Object, required: false },
		suggestionCatalogVersion: { type: String, required: false },
		suggestionTelemetryPayload: { type: Object, required: false },
		placeholderKey: { type: String, required: false },
		isStreaming: { type: Boolean, required: false },
		isSubmitting: { type: Boolean, required: false },
		isWorkflowBuilderAvailable: { type: Boolean, required: false },
		fixedRows: { type: Number, required: false },
	},
	emits: ['submit'],
	setup(props, { emit, expose, slots }) {
		const i18n = useI18n();
		expose({
			focus: vi.fn(),
			// Mirror the real submitSuggestion: resolve the prompt + emit submit.
			submitSuggestion: (payload: { promptKey: BaseTextKey }) =>
				emit('submit', i18n.baseText(payload.promptKey)),
		});
		return () =>
			h('div', { 'data-test-id': 'instance-ai-input-stub' }, [
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-suggestions' },
					props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-suggestions-component' },
					props.suggestionsComponent === undefined ? 'unset' : 'set',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-suggestion-catalog-version' },
					props.suggestionCatalogVersion ?? 'unset',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-suggestions-component-props' },
					props.suggestionsComponentProps === undefined
						? 'unset'
						: JSON.stringify(props.suggestionsComponentProps),
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-suggestion-telemetry-payload' },
					props.suggestionTelemetryPayload === undefined
						? 'unset'
						: JSON.stringify(props.suggestionTelemetryPayload),
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-placeholder-key' },
					props.placeholderKey ?? 'unset',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-fixed-rows' },
					props.fixedRows == null ? 'unset' : String(props.fixedRows),
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-availability' },
					props.isWorkflowBuilderAvailable === false ? 'unavailable' : 'available',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-stub-submit',
						onClick: () => emit('submit', 'hello'),
					},
					'submit',
				),
				...(slots.footer?.() ?? []),
			]);
	},
});

const renderView = createComponentRenderer(InstanceAiEmptyView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: ref(false), toggle: vi.fn() },
		},
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
		},
	},
});

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

const defaultModuleSettings: InstanceAiModuleSettings = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

describe('InstanceAiEmptyView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		});

		const pinia = createTestingPinia();
		setActivePinia(pinia);

		useSettingsStore().moduleSettings = {
			'instance-ai': { ...defaultModuleSettings },
		};
		store = mockedStore(useInstanceAiStore);
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = { id: PERSONAL_PROJECT_ID } as Project;
		thread = {
			id: 'thread-placeholder',
			isStreaming: false,
			isSubmitting: false,
			isAwaitingConfirmation: false,
			amendContext: null,
			contextualSuggestion: null,
			sendMessage: vi.fn().mockResolvedValue(undefined),
		} as unknown as ThreadRuntime;
		store.getOrCreateRuntime.mockReturnValue(thread);
		experimentMocks.proactiveAgentEnabled.value = false;
		experimentMocks.promptSuggestionsV2Enabled.value = false;
		experimentMocks.workflowPreviewEnabled.value = false;
		experimentMocks.splitBelowInputVariant.value = false;
		experimentMocks.personalizedPromptVariant.value = undefined;
		experimentMocks.personalizedPromptFormat.value = null;
		experimentMocks.personalizedPromptTreatmentEnabled.value = false;
		experimentMocks.personalizedPromptProfileOverride.value = null;
		experimentMocks.resolvePersonalizedPromptSuggestions.mockClear();
		cloudPlanStoreMock.state.initialized = false;
		cloudPlanStoreMock.currentUserCloudInfo = null;
		appSettingsStoreMock.isCloudDeployment = false;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it('passes the fixed suggestions to the empty-state composer', () => {
		const { getByTestId, getByText } = renderView();
		// 4 suggestions in INSTANCE_AI_EMPTY_STATE_SUGGESTIONS — suggestions array
		// renders as its `.length`.
		expect(getByText('AI Assistant')).toBeVisible();
		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('4');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-suggestion-catalog-version')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent('unset');
	});

	it('passes v2 copy, suggestions, component, and catalog version when prompt suggestions v2 is enabled', () => {
		experimentMocks.promptSuggestionsV2Enabled.value = true;

		const { getByTestId, getByText } = renderView();

		expect(getByText('What do you want to automate?')).toBeVisible();
		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('12');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('set');
		expect(getByTestId('instance-ai-input-suggestion-catalog-version')).toHaveTextContent('v2');
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent(
			'experiments.instanceAiPromptSuggestionsV2.input.placeholder',
		);
	});

	it('passes personalized card suggestions when the v4 cards treatment resolves metadata', () => {
		experimentMocks.personalizedPromptVariant.value = 'variant-cards';
		experimentMocks.personalizedPromptFormat.value = 'cards';
		experimentMocks.personalizedPromptTreatmentEnabled.value = true;
		appSettingsStoreMock.isCloudDeployment = true;
		cloudPlanStoreMock.state.initialized = true;
		cloudPlanStoreMock.currentUserCloudInfo = {
			information: {
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: 'Lead nurturing',
			},
		};

		const { getByTestId, getByText } = renderView();

		expect(getByText('What do you want to automate?')).toBeVisible();
		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('4');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('set');
		expect(getByTestId('instance-ai-input-suggestion-catalog-version')).toHaveTextContent(
			'v4-personalized',
		);
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent(
			'experiments.instanceAiPromptSuggestionsV2.input.placeholder',
		);
		expect(getByTestId('instance-ai-input-suggestions-component-props')).toHaveTextContent(
			'"format":"cards"',
		);
		expect(getByTestId('instance-ai-input-suggestions-component-props')).toHaveTextContent(
			'"showSeeMore":true',
		);
		expect(getByTestId('instance-ai-input-suggestion-telemetry-payload')).toHaveTextContent(
			'"suggestion_catalog_version":"v4-personalized"',
		);
		expect(getByTestId('instance-ai-input-suggestion-telemetry-payload')).toHaveTextContent(
			'"$feature/090_instance_ai_personalized_prompt_suggestions":"variant-cards"',
		);
	});

	it('uses a personalized profile override without waiting for cloud metadata', () => {
		experimentMocks.personalizedPromptVariant.value = 'variant-cards';
		experimentMocks.personalizedPromptFormat.value = 'cards';
		experimentMocks.personalizedPromptTreatmentEnabled.value = true;
		experimentMocks.personalizedPromptProfileOverride.value = {
			kind: 'segment',
			role: 'sales',
			useCase: 'lead-nurturing',
			segmentKey: 'sales:lead-nurturing',
		};
		appSettingsStoreMock.isCloudDeployment = true;
		cloudPlanStoreMock.state.initialized = false;

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('4');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('set');
		expect(experimentMocks.resolvePersonalizedPromptSuggestions).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: null,
				metadataLoadState: 'loaded',
				profileOverride: experimentMocks.personalizedPromptProfileOverride.value,
			}),
		);
		expect(getByTestId('instance-ai-input-suggestion-telemetry-payload')).toHaveTextContent(
			'"profile_override":true',
		);
	});

	it('does not pass a suggestion component while personalized metadata is pending', () => {
		experimentMocks.personalizedPromptVariant.value = 'variant-list';
		experimentMocks.personalizedPromptFormat.value = 'list';
		experimentMocks.personalizedPromptTreatmentEnabled.value = true;
		appSettingsStoreMock.isCloudDeployment = true;
		cloudPlanStoreMock.state.initialized = false;

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('0');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent(
			'experiments.instanceAiPromptSuggestionsV2.input.placeholder',
		);
	});

	it('passes fallback personalized suggestions after the metadata timeout', async () => {
		vi.useFakeTimers();
		experimentMocks.personalizedPromptVariant.value = 'variant-list';
		experimentMocks.personalizedPromptFormat.value = 'list';
		experimentMocks.personalizedPromptTreatmentEnabled.value = true;
		appSettingsStoreMock.isCloudDeployment = true;
		cloudPlanStoreMock.state.initialized = false;

		const { getByTestId } = renderView();

		await vi.advanceTimersByTimeAsync(2000);
		await flushPromises();

		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('4');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('set');
		expect(getByTestId('instance-ai-input-suggestions-component-props')).toHaveTextContent(
			'"format":"list"',
		);
		expect(getByTestId('instance-ai-input-suggestions-component-props')).toHaveTextContent(
			'"showSeeMore":false',
		);
		expect(getByTestId('instance-ai-input-suggestion-telemetry-payload')).toHaveTextContent(
			'"metadata_load_state":"timed_out"',
		);

		vi.useRealTimers();
	});

	it('passes workflow preview suggestions, component, and catalog version when workflow preview experiment is enabled', () => {
		experimentMocks.workflowPreviewEnabled.value = true;

		const { getByTestId, getByText } = renderView();

		expect(getByText('What do you want to automate?')).toBeVisible();
		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('4');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('set');
		expect(getByTestId('instance-ai-input-suggestion-catalog-version')).toHaveTextContent(
			'v3-workflow-preview',
		);
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent(
			'experiments.instanceAiWorkflowPreviewSuggestions.input.placeholder',
		);
	});

	it('renders the proactive starter and moves suggestions out of the composer when enabled', () => {
		experimentMocks.proactiveAgentEnabled.value = true;
		experimentMocks.promptSuggestionsV2Enabled.value = true;

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('instance-ai-proactive-starter')).toHaveTextContent('starter');
		expect(queryByTestId('instance-ai-empty-state')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-input-suggestions')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-suggestions-component')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-suggestion-catalog-version')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent('unset');
	});

	it('renders the split layout and hides the default empty state for the examples-below-input variant', () => {
		experimentMocks.splitBelowInputVariant.value = true;

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('instance-ai-split-empty-state')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-empty-state')).not.toBeInTheDocument();
	});

	it('passes the experiment placeholder key and fixed-rows to the input inside the split layout', () => {
		experimentMocks.splitBelowInputVariant.value = true;

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-placeholder-key')).toHaveTextContent(
			'experiments.instanceAiSplitEmptyState.input.placeholder',
		);
		expect(getByTestId('instance-ai-input-fixed-rows')).toHaveTextContent('5');
	});

	it('shows the project selector in the split layout when the user has more than the personal project', () => {
		experimentMocks.splitBelowInputVariant.value = true;
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.myProjects = [
			{ id: PERSONAL_PROJECT_ID, type: 'personal' },
			{ id: 'team-project', type: 'team', name: 'Team project' },
		] as ProjectListItem[];

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-split-project-select')).toBeInTheDocument();
	});

	it('hides the project selector in the split layout when only the personal project exists', () => {
		experimentMocks.splitBelowInputVariant.value = true;
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.myProjects = [{ id: PERSONAL_PROJECT_ID, type: 'personal' }] as ProjectListItem[];

		const { queryByTestId } = renderView();

		expect(queryByTestId('instance-ai-split-project-select')).not.toBeInTheDocument();
	});

	it('resolves the promptKey and creates a thread when the shelf emits submit-suggestion (split enabled)', async () => {
		experimentMocks.splitBelowInputVariant.value = true;
		store.syncThread.mockResolvedValue(undefined);

		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-split-stub-submit'));
		await flushPromises();

		expect(store.syncThread).toHaveBeenCalledWith('thread-placeholder', PERSONAL_PROJECT_ID);
		expect(store.getOrCreateRuntime).toHaveBeenCalledWith(
			'thread-placeholder',
			PERSONAL_PROJECT_ID,
		);
		expect(thread.sendMessage).toHaveBeenCalledWith(
			'When a new lead is created in my CRM, enrich it with Lemlist, score it based on fit, then update the lead if qualified and notify the sales team on Slack.',
			undefined,
			'test-push-ref',
		);
		expect(replaceMock).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-placeholder' },
		});
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('renders the default empty state for the control variant', () => {
		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('instance-ai-empty-state')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-split-empty-state')).not.toBeInTheDocument();
	});

	it('renders the proactive starter and hides the split layout when both 082 and 089 are enabled', () => {
		experimentMocks.proactiveAgentEnabled.value = true;
		experimentMocks.splitBelowInputVariant.value = true;

		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('instance-ai-proactive-starter')).toHaveTextContent('starter');
		expect(queryByTestId('instance-ai-split-empty-state')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-empty-state')).not.toBeInTheDocument();
	});

	it('does not create a runtime before the first send', () => {
		renderView();
		expect(store.getOrCreateRuntime).not.toHaveBeenCalled();
	});

	it('navigates to the thread view and dispatches sendMessage when syncThread succeeds', async () => {
		store.syncThread.mockResolvedValue(undefined);
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(store.syncThread).toHaveBeenCalledWith('thread-placeholder', PERSONAL_PROJECT_ID);
		expect(store.getOrCreateRuntime).toHaveBeenCalledWith(
			'thread-placeholder',
			PERSONAL_PROJECT_ID,
		);
		expect(thread.sendMessage).toHaveBeenCalledWith('hello', undefined, 'test-push-ref');
		expect(replaceMock).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-placeholder' },
		});
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows a toast and stays on the empty view when syncThread rejects', async () => {
		store.syncThread.mockRejectedValue(new Error('persist failed'));
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalled();
		expect(store.getOrCreateRuntime).not.toHaveBeenCalled();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('shows an upfront unavailable state and does not start a thread when the builder is unavailable', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': {
				...defaultModuleSettings,
				sandboxEnabled: false,
				workflowBuilderAvailable: false,
			},
		};
		const { getByTestId, getByText } = renderView();

		expect(getByTestId('instance-ai-workflow-builder-unavailable')).toBeVisible();
		expect(getByText('Workflow builder unavailable')).toBeVisible();
		expect(getByTestId('instance-ai-input-availability')).toHaveTextContent('unavailable');

		await fireEvent.click(getByTestId('instance-ai-input-stub-submit'));
		await flushPromises();

		expect(store.syncThread).not.toHaveBeenCalled();
		expect(store.getOrCreateRuntime).not.toHaveBeenCalled();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(replaceMock).not.toHaveBeenCalled();
	});
});
