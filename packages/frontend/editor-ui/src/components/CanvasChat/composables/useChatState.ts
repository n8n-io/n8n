import type { RunWorkflowChatPayload } from '@/components/CanvasChat/composables/useChatMessaging';
import { useChatMessaging } from '@/components/CanvasChat/composables/useChatMessaging';
import { useChatTrigger } from '@/components/CanvasChat/composables/useChatTrigger';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { VIEWS } from '@/constants';
import { type INodeUi } from '@/Interface';
import { useCanvasStore } from '@/stores/canvas.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import { type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { Ref } from 'vue';
import { computed, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { LOGS_PANEL_STATE } from '../types/logs';
import { restoreChatHistory } from '@/components/CanvasChat/utils';

interface ChatState {
	currentSessionId: Ref<string>;
	messages: Ref<ChatMessage[]>;
	chatTriggerNode: Ref<INodeUi | null>;
	connectedNode: Ref<INode | null>;
	sendMessage: (message: string, files?: File[]) => Promise<void>;
	refreshSession: () => void;
	displayExecution: (executionId: string) => void;
}

export function useChatState(isReadOnly: boolean, onWindowResize?: () => void): ChatState {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const canvasStore = useCanvasStore();
	const router = useRouter();
	const nodeHelpers = useNodeHelpers();
	const { runWorkflow } = useRunWorkflow({ router });

	const messages = ref<ChatMessage[]>([]);
	const currentSessionId = ref<string>(uuid().replace(/-/g, ''));

	const canvasNodes = computed(() => workflowsStore.allNodes);
	const allConnections = computed(() => workflowsStore.allConnections);
	const logsPanelState = computed(() => workflowsStore.logsPanelState);
	const workflow = computed(() => workflowsStore.getCurrentWorkflow());

	// Initialize features with injected dependencies
	const {
		chatTriggerNode,
		connectedNode,
		allowFileUploads,
		allowedFilesMimeTypes,
		setChatTriggerNode,
		setConnectedNode,
	} = useChatTrigger({
		workflow,
		canvasNodes,
		getNodeByName: workflowsStore.getNodeByName,
		getNodeType: nodeTypesStore.getNodeType,
	});

	const { sendMessage, isLoading } = useChatMessaging({
		chatTrigger: chatTriggerNode,
		messages,
		sessionId: currentSessionId,
		executionResultData: computed(() => workflowsStore.getWorkflowExecution?.data?.resultData),
		onRunChatWorkflow,
	});

	// Extracted pure functions for better testability
	function createChatConfig(params: {
		messages: Chat['messages'];
		sendMessage: Chat['sendMessage'];
		currentSessionId: Chat['currentSessionId'];
		isLoading: Ref<boolean>;
		isDisabled: Ref<boolean>;
		allowFileUploads: Ref<boolean>;
		locale: ReturnType<typeof useI18n>;
	}): { chatConfig: Chat; chatOptions: ChatOptions } {
		const chatConfig: Chat = {
			messages: params.messages,
			sendMessage: params.sendMessage,
			initialMessages: ref([]),
			currentSessionId: params.currentSessionId,
			waitingForResponse: params.isLoading,
		};

		const chatOptions: ChatOptions = {
			i18n: {
				en: {
					title: '',
					footer: '',
					subtitle: '',
					inputPlaceholder: params.locale.baseText('chat.window.chat.placeholder'),
					getStarted: '',
					closeButtonTooltip: '',
				},
			},
			webhookUrl: '',
			mode: 'window',
			showWindowCloseButton: true,
			disabled: params.isDisabled,
			allowFileUploads: params.allowFileUploads,
			allowedFilesMimeTypes,
		};

		return { chatConfig, chatOptions };
	}

	// Initialize chat config
	const { chatConfig, chatOptions } = createChatConfig({
		messages,
		sendMessage,
		currentSessionId,
		isLoading,
		isDisabled: computed(() => isReadOnly),
		allowFileUploads,
		locale,
	});

	const restoredChatMessages = computed(() =>
		restoreChatHistory(
			workflowsStore.workflowExecutionData,
			locale.baseText('chat.window.chat.response.empty'),
		),
	);

	// Provide chat context
	provide(ChatSymbol, chatConfig);
	provide(ChatOptionsSymbol, chatOptions);

	// Watchers
	watch(
		() => logsPanelState.value,
		(state) => {
			if (state !== LOGS_PANEL_STATE.CLOSED) {
				setChatTriggerNode();
				setConnectedNode();

				setTimeout(() => {
					onWindowResize?.();
					chatEventBus.emit('focusInput');
				}, 0);
			}
		},
		{ immediate: true },
	);

	watch(
		() => allConnections.value,
		() => {
			if (canvasStore.isLoading) return;
			setTimeout(() => {
				if (!chatTriggerNode.value) {
					setChatTriggerNode();
				}
				setConnectedNode();
			}, 0);
		},
		{ deep: true },
	);

	// This function creates a promise that resolves when the workflow execution completes
	// It's used to handle the loading state while waiting for the workflow to finish
	async function createExecutionPromise() {
		return await new Promise<void>((resolve) => {
			const resolveIfFinished = (isRunning: boolean) => {
				if (!isRunning) {
					unwatch();
					resolve();
				}
			};

			// Watch for changes in the workflow execution status
			const unwatch = watch(() => workflowsStore.isWorkflowRunning, resolveIfFinished);
			resolveIfFinished(workflowsStore.isWorkflowRunning);
		});
	}

	async function onRunChatWorkflow(payload: RunWorkflowChatPayload) {
		const runWorkflowOptions: Parameters<typeof runWorkflow>[0] = {
			triggerNode: payload.triggerNode,
			nodeData: payload.nodeData,
			source: payload.source,
		};

		if (workflowsStore.chatPartialExecutionDestinationNode) {
			runWorkflowOptions.destinationNode = workflowsStore.chatPartialExecutionDestinationNode;
			workflowsStore.chatPartialExecutionDestinationNode = null;
		}

		const response = await runWorkflow(runWorkflowOptions);

		if (response) {
			await createExecutionPromise();
			workflowsStore.appendChatMessage(payload.message);
			return response;
		}
		return;
	}

	function refreshSession() {
		workflowsStore.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
		messages.value = [];
		currentSessionId.value = uuid().replace(/-/g, '');
	}

	function displayExecution(executionId: string) {
		const route = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: workflow.value.id, executionId },
		});
		window.open(route.href, '_blank');
	}

	return {
		currentSessionId,
		messages: computed(() => (isReadOnly ? restoredChatMessages.value : messages.value)),
		chatTriggerNode,
		connectedNode,
		sendMessage,
		refreshSession,
		displayExecution,
	};
}
