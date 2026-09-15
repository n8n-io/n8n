import { vi } from 'vitest';
import { defineComponent, h, reactive, ref, type Component } from 'vue';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type { FrontendModuleSettings, InstanceAiMessage } from '@n8n/api-types';

type RendererOptions = { merge?: boolean };

/** A bare, all-mocked `ThreadRuntime` for components that only need the shape, not real behaviour. */
export function makeThread(): ThreadRuntime {
	return reactive({
		id: 'thread-1',
		messages: [] as InstanceAiMessage[],
		hasMessages: false,
		sseState: 'connected',
		isStreaming: false,
		isSendingMessage: false,
		isAwaitingConfirmation: false,
		isHydratingThread: false,
		amendContext: null,
		activePlanEdit: null,
		updatingPlanRequestIds: new Set<string>(),
		contextualSuggestion: null,
		currentTasks: null,
		producedArtifacts: new Map(),
		resourceNameIndex: new Map(),
		linkableResourceNameIndex: new Map(),
		feedbackByResponseId: {},
		rateableResponseId: null,
		pendingConfirmations: [],
		resolvedConfirmationIds: new Map(),
		debugEvents: [],
		loadHistoricalMessages: vi.fn().mockResolvedValue('applied'),
		loadThreadStatus: vi.fn().mockResolvedValue(undefined),
		connectSSE: vi.fn(),
		closeSSE: vi.fn(),
		sendMessage: vi.fn().mockResolvedValue(true),
		cancelRun: vi.fn().mockResolvedValue(undefined),
		resolveConfirmation: vi.fn(),
		confirmAction: vi.fn().mockResolvedValue(true),
		markPlanUpdatePending: vi.fn(),
		clearPlanUpdatePending: vi.fn(),
		cancelPlanEdit: vi.fn(),
		copyFullTrace: vi.fn(),
		submitFeedback: vi.fn(),
	}) as unknown as ThreadRuntime;
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
		isPlanEditMode: { type: Boolean, required: false },
		isWorkflowBuilderAvailable: { type: Boolean, required: false },
		contextChip: { type: Object, required: false },
	},
	emits: ['submit', 'cancel-plan-edit', 'dismiss-context-chip'],
	setup(props, { emit, expose }) {
		const inputDraft = ref(inputState.initialDraft);
		const hasAttachments = ref(inputState.hasAttachments);
		const setText = (text: string) => {
			inputDraft.value = text;
			inputSetTextSpy(text);
		};
		const clearTextIfMatches = (text: string) => {
			if (inputDraft.value === text) setText('');
		};
		const isDirty = () => inputDraft.value.trim().length > 0 || hasAttachments.value;
		expose({ focus: inputFocusSpy, setText, clearTextIfMatches, isDirty });
		return () =>
			h('div', { 'data-test-id': 'instance-ai-input-stub' }, [
				props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-mode' },
					props.isPlanEditMode ? 'plan-edit' : 'normal',
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
							const message = props.isPlanEditMode
								? planEditSubmitState.message
								: inputDraft.value || 'Normal message';
							const submittedHasAttachments = hasAttachments.value;
							if (submittedHasAttachments) {
								emit('submit', message, undefined, () => {
									if (isDirty()) return false;
									setText(message);
									hasAttachments.value = submittedHasAttachments;
									return true;
								});
							} else {
								emit('submit', message, undefined);
							}
							inputDraft.value = '';
							hasAttachments.value = false;
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
				props.isPlanEditMode
					? h(
							'button',
							{
								'data-test-id': 'instance-ai-input-cancel-plan-edit',
								onClick: () => emit('cancel-plan-edit'),
							},
							'Cancel',
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
