import { vi } from 'vitest';
import { defineComponent, h, reactive, ref, type Component } from 'vue';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type {
	FrontendModuleSettings,
	InstanceAiMessage,
	InstanceAiQueuedMessage,
} from '@n8n/api-types';
import {
	USER_TYPED_MESSAGE,
	type InstanceAiMessageAuthorship,
	type InstanceAiPrefillType,
} from '../prefills';

type RendererOptions = { merge?: boolean };

/** A bare, all-mocked `ThreadRuntime` for components that only need the shape, not real behaviour. */
export function makeThread(): ThreadRuntime {
	const thread = reactive({
		id: 'thread-1',
		messages: [] as InstanceAiMessage[],
		queuedMessages: [] as InstanceAiQueuedMessage[],
		hasMessages: false,
		sseState: 'connected',
		isStreaming: false,
		isSendingMessage: false,
		isAwaitingConfirmation: false,
		isHydratingThread: false,
		amendContext: null,
		pendingPlanReview: null,
		updatingPlanRequestIds: new Set<string>(),
		contextualSuggestion: null,
		currentTasks: null,
		producedArtifacts: new Map(),
		resourceNameIndex: new Map(),
		linkableResourceNameIndex: new Map(),
		activeArtifactId: undefined,
		setActiveArtifactId: vi.fn(),
		feedbackByResponseId: {},
		rateableResponseId: null,
		pendingConfirmations: [],
		resolvedConfirmationIds: new Map(),
		debugEvents: [],
		pendingWorkflowAttachment: null as {
			type: 'workflow';
			id: string;
			name?: string;
			executionId?: string;
		} | null,
		setPendingWorkflowAttachment: vi.fn(),
		clearPendingWorkflowAttachment: vi.fn(),
		loadHistoricalMessages: vi.fn().mockResolvedValue('applied'),
		loadThreadStatus: vi.fn().mockResolvedValue(undefined),
		loadQueuedMessages: vi.fn().mockResolvedValue(undefined),
		queueMessage: vi.fn().mockResolvedValue(true),
		removeQueuedMessage: vi.fn().mockResolvedValue(undefined),
		sendQueueNow: vi.fn().mockResolvedValue(undefined),
		takeQueuedMessageForEdit: vi.fn().mockResolvedValue(null),
		connectSSE: vi.fn(),
		closeSSE: vi.fn(),
		sendMessage: vi.fn().mockResolvedValue(true),
		cancelRun: vi.fn().mockResolvedValue(undefined),
		resolveConfirmation: vi.fn(),
		confirmAction: vi.fn().mockResolvedValue(true),
		requestPlanChanges: vi.fn().mockResolvedValue(true),
		copyFullTrace: vi.fn(),
		submitFeedback: vi.fn(),
	});
	thread.setActiveArtifactId = vi.fn((id) => {
		thread.activeArtifactId = id;
	});
	thread.setPendingWorkflowAttachment = vi.fn((value) => {
		thread.pendingWorkflowAttachment = value;
	});
	thread.clearPendingWorkflowAttachment = vi.fn(() => {
		thread.pendingWorkflowAttachment = null;
	});
	return thread as unknown as ThreadRuntime;
}

export const defaultModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
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

// Shared mutable fixtures the stub below reads from — tests reset them in `beforeEach`
// and assert against the spies directly (e.g. `expect(inputFocusSpy).toHaveBeenCalled()`).
export const inputState = { initialDraft: '', hasAttachments: false };
export const inputFocusSpy = vi.fn();
export const inputSetTextSpy = vi.fn();
export const planEditSubmitState = { message: 'Make the plan simpler' };

/** Fake `InstanceAiInput` exposing the same surface real callers rely on (focus/setText/…). */
export const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
		isAwaitingPlanReview: { type: Boolean, required: false },
		isSubmitting: { type: Boolean, required: false },
		queueWhileStreaming: { type: Boolean, required: false },
		queueFull: { type: Boolean, required: false },
		isWorkflowBuilderAvailable: { type: Boolean, required: false },
		contextChip: { type: Object, required: false },
	},
	emits: ['submit', 'dismiss-context-chip'],
	setup(props, { emit, expose }) {
		const inputDraft = ref(inputState.initialDraft);
		const hasAttachments = ref(inputState.hasAttachments);
		// Mirrors the real composer: whatever pre-filled the box is reported on submit,
		// and a pre-fill must arrive through setPrefill rather than setText.
		const activePrefill = ref<{ text: string; prefillType: InstanceAiPrefillType } | null>(null);
		const setText = (text: string) => {
			inputDraft.value = text;
			// Emptying the box drops the pre-fill, as the real composer's watcher does:
			// a dismissed draft must not attribute whatever the user types next.
			if (text.length === 0) activePrefill.value = null;
			inputSetTextSpy(text);
		};
		const setPrefill = (prefill: { text: string; prefillType: InstanceAiPrefillType }) => {
			setText(prefill.text);
			activePrefill.value = { ...prefill };
		};
		const clearTextIfMatches = (text: string) => {
			if (inputDraft.value === text) setText('');
		};
		const isDirty = () => inputDraft.value.trim().length > 0 || hasAttachments.value;
		const resolveAuthorship = (message: string): InstanceAiMessageAuthorship => {
			const prefill = activePrefill.value;
			if (!prefill) return USER_TYPED_MESSAGE;
			return {
				kind: 'prefill',
				prefillType: prefill.prefillType,
				promptModified: message !== prefill.text.trim(),
			};
		};
		expose({ focus: inputFocusSpy, setText, setPrefill, clearTextIfMatches, isDirty });
		return () =>
			h('div', { 'data-test-id': 'instance-ai-input-stub' }, [
				props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-mode' },
					props.isAwaitingPlanReview ? 'plan-review' : 'normal',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-busy' },
					props.isSubmitting ? 'busy' : 'idle',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-availability' },
					props.isWorkflowBuilderAvailable === false ? 'unavailable' : 'available',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-context-chip' },
					props.contextChip?.label ?? '',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-context-chip-icon' },
					props.contextChip?.icon ?? '',
				),
				h('span', { 'data-test-id': 'instance-ai-input-draft' }, inputDraft.value),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-attachments' },
					hasAttachments.value ? 'attached' : '',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-edit-draft',
						onClick: () => setText('Edited user draft'),
					},
					'Edit draft',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-add-attachment',
						onClick: () => {
							hasAttachments.value = true;
						},
					},
					'Add attachment',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-submit',
						onClick: () => {
							const message = props.isAwaitingPlanReview
								? planEditSubmitState.message
								: inputDraft.value || 'Normal message';
							const submittedHasAttachments = hasAttachments.value;
							const authorship = resolveAuthorship(message);
							const submittedPrefill = activePrefill.value;
							// Mirrors the real composer: always provided, and it restores the
							// pre-fill with the text so a retry stays attributed.
							emit(
								'submit',
								message,
								undefined,
								() => {
									if (isDirty()) return false;
									setText(message);
									activePrefill.value = submittedPrefill;
									hasAttachments.value = submittedHasAttachments;
									return true;
								},
								authorship,
							);
							inputDraft.value = '';
							hasAttachments.value = false;
							activePrefill.value = null;
						},
					},
					'Submit',
				),
				props.contextChip
					? h(
							'button',
							{
								'data-test-id': 'instance-ai-input-dismiss-context-chip',
								onClick: () => emit('dismiss-context-chip'),
							},
							'Dismiss context',
						)
					: null,
			]);
	},
});

export function createThreadComponentRenderer<T extends Component>(
	component: T,
	defaultOptions: RenderOptions<T> = {},
	getThread?: () => ThreadRuntime,
) {
	const ThreadProvider = defineComponent({
		name: 'InstanceAiThreadTestProvider',
		inheritAttrs: false,
		setup(_, { attrs, slots }) {
			const store = useInstanceAiStore();
			provideThread(getThread?.() ?? store.getOrCreateRuntime('thread-1'));
			return () => h(component, attrs, slots);
		},
	});

	const renderProvider = createComponentRenderer(
		ThreadProvider,
		defaultOptions as unknown as RenderOptions<typeof ThreadProvider>,
	);

	return (options: RenderOptions<T> = {}, rendererOptions: RendererOptions = {}) =>
		renderProvider(options as unknown as RenderOptions<typeof ThreadProvider>, rendererOptions);
}
