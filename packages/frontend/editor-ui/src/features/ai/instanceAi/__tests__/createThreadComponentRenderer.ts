import { vi } from 'vitest';
import { defineComponent, h, reactive, type Component } from 'vue';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type { FrontendModuleSettings, InstanceAiMessage } from '@n8n/api-types';



type RendererOptions = { merge?: boolean };

/** A bare, all-mocked `ThreadRuntime` for components that only need the shape, not real behaviour. */
export function makeThread(): ThreadRuntime {
	const thread = reactive({
		id: 'thread-1',
		messages: [] as InstanceAiMessage[],
		hasMessages: false,
		isStreaming: false,
		isSendingMessage: false,
		isAwaitingConfirmation: false,
		hydrationStatus: 'ready',
		isHydratingThread: false,
		currentTasks: null,
		producedArtifacts: new Map(),
		producedArtifactOrigins: new Map(),
		setupItemsByWorkflowId: {},
		projectId: 'thread-project',
		resourceNameIndex: new Map(),
		linkableResourceNameIndex: new Map(),
		activeArtifactId: undefined,
		setActiveArtifactId: vi.fn(),
		setOpenTabs: vi.fn(),
		pendingWorkflowAttachment: null as {
			type: 'workflow';
			id: string;
			name?: string;
			executionId?: string;
		} | null,
		setPendingWorkflowAttachment: vi.fn(),
		clearPendingWorkflowAttachment: vi.fn(),
		transientWorkflowReferences: new Map(),
		upsertTransientWorkflowReference: vi.fn(),
		removeTransientWorkflowReference: vi.fn(),
		registerSetupChatTelemetryContext: vi.fn(() => vi.fn()),
		registerChatSender: vi.fn(() => vi.fn()),
		threadArtifactsContext: vi.fn(),
		recordSentAttachments: vi.fn(),
		findToolCallByRequestId: vi.fn(),
		sendMessage: vi.fn().mockResolvedValue(true),
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
	thread.upsertTransientWorkflowReference = vi.fn((reference) => {
		thread.transientWorkflowReferences.set(reference.referenceId, reference);
	});
	thread.removeTransientWorkflowReference = vi.fn((referenceId) => {
		thread.transientWorkflowReferences.delete(referenceId);
	});
	return thread as unknown as ThreadRuntime;
}

export const defaultModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
	enabled: true,
	mcpConnectionsAvailable: true,
	localGatewayDisabled: false,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

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
