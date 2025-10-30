import type { RunWorkflowChatPayload } from '@/features/execution/logs/composables/useChatMessaging';
import { useChatMessaging } from '@/features/execution/logs/composables/useChatMessaging';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ChatOptionsSymbol } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import { v4 as uuid } from 'uuid';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { computed, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsStore } from '@/stores/logs.store';
import { restoreChatHistory } from '@/features/execution/logs/logs.utils';
import type { INode, INodeParameters } from 'n8n-workflow';
import { isChatNode } from '@/utils/aiUtils';
import { constructChatWebsocketUrl } from '@n8n/chat/utils';
import { injectWorkflowState } from '@/composables/useWorkflowState';

type IntegratedChat = Omit<Chat, 'sendMessage'> & {
	sendMessage: (text: string, files: File[]) => Promise<void>;
};

const ChatSymbol = 'Chat' as unknown as InjectionKey<IntegratedChat>;

interface ChatState {
	currentSessionId: ComputedRef<string>;
	messages: ComputedRef<ChatMessage[]>;
	previousChatMessages: ComputedRef<string[]>;
	sendMessage: (message: string, files?: File[]) => Promise<void>;
	refreshSession: () => void;
	displayExecution: (executionId: string) => void;
	chatTriggerNode: ComputedRef<INode | null>;
	isStreamingEnabled: ComputedRef<boolean>;
	isFileUploadsAllowed: ComputedRef<boolean>;
	allowedFilesMimeTypes: ComputedRef<string>;
	isWorkflowReadyForChat: ComputedRef<boolean>;
	webhookUrl: ComputedRef<string>;
	chatOptions: ComputedRef<ChatOptions>;
	registerChatWebhook: () => Promise<void>;
	webhookRegistered: Ref<boolean>;
	isRegistering: Ref<boolean>;
}

export function useChatState(isReadOnly: boolean, sessionId?: string): ChatState {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const rootStore = useRootStore();
	const logsStore = useLogsStore();
	const router = useRouter();
	const nodeHelpers = useNodeHelpers();
	const { runWorkflow } = useRunWorkflow({ router });

	const ws = ref<WebSocket | null>(null);
	const webhookRegistered = ref(false);
	const isRegistering = ref(false);
	const messages = computed(() => logsStore.chatSessionMessages);
	const currentSessionId = computed(() => logsStore.chatSessionId);

	// Use provided sessionId or fall back to logsStore sessionId
	const effectiveSessionId = computed(() => sessionId ?? currentSessionId.value);

	const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
	const chatTriggerNode = computed(() => workflowsStore.allNodes.find(isChatNode) ?? null);
	const allowFileUploads = computed(
		() =>
			(chatTriggerNode.value?.parameters?.options as INodeParameters)?.allowFileUploads === true,
	);
	const allowedFilesMimeTypes = computed(
		() =>
			(
				chatTriggerNode.value?.parameters?.options as INodeParameters
			)?.allowedFilesMimeTypes?.toString() ?? '',
	);

	const respondNodesResponseMode = computed(
		() =>
			(chatTriggerNode.value?.parameters?.options as { responseMode?: string })?.responseMode ===
			'responseNodes',
	);

	// Check if streaming is enabled in ChatTrigger node
	const isStreamingEnabled = computed(() => {
		const options = chatTriggerNode.value?.parameters?.options;

		if (options && typeof options === 'object' && 'responseMode' in options) {
			const responseMode = options.responseMode;
			return responseMode === 'streaming';
		}

		return false;
	});

	// Check if file uploads are allowed in ChatTrigger node
	const isFileUploadsAllowed = computed(() => {
		const options = chatTriggerNode.value?.parameters?.options;

		if (options && typeof options === 'object' && 'allowFileUploads' in options) {
			return !!options.allowFileUploads;
		}

		return false;
	});

	// Get allowed file MIME types from ChatTrigger node
	const allowedFilesMimeTypesComputed = computed(() => {
		const options = chatTriggerNode.value?.parameters?.options;

		if (options && typeof options === 'object' && 'allowedFilesMimeTypes' in options) {
			return options.allowedFilesMimeTypes as string;
		}

		return 'image/*';
	});

	// Check if workflow is ready for chat execution
	const isWorkflowReadyForChat = computed(() => {
		// Must have a ChatTrigger node
		if (!chatTriggerNode.value) {
			return false;
		}

		// Must have a valid workflow ID (for new workflows, this might not be set until saved)
		if (!workflowsStore.workflowId && !workflowsStore.isNewWorkflow) {
			return false;
		}

		return true;
	});

	const webhookUrl = computed(() => {
		if (!chatTriggerNode.value) {
			return '';
		}

		const workflowId = workflowsStore.workflowId;
		if (!workflowId) {
			return '';
		}

		const url = `${rootStore.webhookTestUrl}/${workflowId}/${effectiveSessionId.value}`;

		return url;
	});

	// Register ChatTrigger webhook for test execution
	async function registerChatWebhook(): Promise<void> {
		if (isRegistering.value || !chatTriggerNode.value) {
			return;
		}

		isRegistering.value = true;

		try {
			// Use the useRunWorkflow composable to properly register the webhook
			await runWorkflow({
				triggerNode: chatTriggerNode.value.name,
				source: 'RunData.ManualChatTrigger',
				sessionId: effectiveSessionId.value,
			});

			webhookRegistered.value = true;
		} finally {
			isRegistering.value = false;
		}
	}

	const chatOptionsComputed = computed<ChatOptions>(() => {
		const options: ChatOptions = {
			webhookUrl: webhookUrl.value,
			webhookConfig: {
				method: 'POST' as const,
				headers: {
					'Content-Type': 'application/json',
				},
			},
			mode: 'fullscreen' as const,
			showWindowCloseButton: false,
			showWelcomeScreen: false,
			// Force the chat SDK to use our canvas session ID
			sessionId: effectiveSessionId.value,
			// Enable streaming based on ChatTrigger node configuration
			enableStreaming: isStreamingEnabled.value,
			// Enable message actions (repost and copy to input)
			enableMessageActions: true,
			// Enable file uploads based on ChatTrigger node configuration
			allowFileUploads: isFileUploadsAllowed.value,
			allowedFilesMimeTypes: allowedFilesMimeTypesComputed.value,
			// Use the correct field names that ChatTrigger expects
			chatInputKey: 'chatInput',
			chatSessionKey: 'sessionId',
			defaultLanguage: 'en' as const,
			messageHistory: messages.value,
			i18n: {
				en: {
					title: locale.baseText('chat.window.title') || 'Chat',
					subtitle: 'Test your workflow',
					footer: '',
					getStarted: 'Send a message',
					inputPlaceholder:
						locale.baseText('chat.window.chat.placeholder') || 'Type your message...',
					closeButtonTooltip: 'Close',
				},
			},
			beforeMessageSent: async (message: string) => {
				// Register fresh webhook before each message to ensure it's active
				// This gives us a fresh webhook with full timeout for each message
				await registerChatWebhook();

				// Store user message for persistence
				if (!isReadOnly) {
					logsStore.addChatMessage({
						id: uuid(),
						text: message,
						sender: 'user',
					});
				}
			},
			afterMessageSent: async (_message: string, response) => {
				// Store bot response for persistence
				if (!isReadOnly && response) {
					// For streaming, response is { hasReceivedChunks: boolean }
					// For non-streaming, it's SendMessageResponse
					if ('hasReceivedChunks' in response) {
						return;
					}

					// Extract bot message from non-streaming response
					const botMessage = response.output ?? response.text ?? response.message;
					if (botMessage && typeof botMessage === 'string') {
						logsStore.addChatMessage({
							id: uuid(),
							text: botMessage,
							sender: 'bot',
						});
					}
				}
			},
		};
		return options;
	});

	const { sendMessage, isLoading, setLoadingState } = useChatMessaging({
		chatTrigger: chatTriggerNode,
		sessionId: currentSessionId.value,
		executionResultData: computed(() => workflowsStore.getWorkflowExecution?.data?.resultData),
		onRunChatWorkflow,
		onNewMessage: logsStore.addChatMessage,
		ws,
	});

	// Extracted pure functions for better testability
	function createChatConfig(params: {
		messages: Chat['messages'];
		sendMessage: IntegratedChat['sendMessage'];
		currentSessionId: Chat['currentSessionId'];
		isLoading: Ref<boolean>;
		isDisabled: Ref<boolean>;
		allowFileUploads: Ref<boolean>;
		locale: ReturnType<typeof useI18n>;
	}): { chatConfig: IntegratedChat; chatOptions: ChatOptions } {
		const chatConfig: IntegratedChat = {
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
			if (respondNodesResponseMode.value) {
				const wsUrl = constructChatWebsocketUrl(
					rootStore.urlBaseEditor,
					response.executionId as string,
					currentSessionId.value,
					false,
				);

				ws.value = new WebSocket(wsUrl);
				ws.value.onmessage = (event) => {
					if (event.data === 'n8n|heartbeat') {
						ws.value?.send('n8n|heartbeat-ack');
						return;
					}
					if (event.data === 'n8n|continue') {
						setLoadingState(true);
						return;
					}
					setLoadingState(false);
					const newMessage: ChatMessage & { sessionId: string } = {
						text: event.data,
						sender: 'bot',
						sessionId: currentSessionId.value,
						id: uuid(),
					};
					logsStore.addChatMessage(newMessage);

					if (logsStore.isOpen) {
						chatEventBus.emit('focusInput');
					}
				};
				ws.value.onclose = () => {
					setLoadingState(false);
					ws.value = null;
				};
			}

			await createExecutionPromise();
			workflowsStore.appendChatMessage(payload.message);
			return response;
		}
		return;
	}

	function refreshSession() {
		workflowState.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
		logsStore.resetChatSessionId();
		logsStore.resetMessages();

		if (logsStore.isOpen) {
			chatEventBus.emit('focusInput');
		}
	}

	function displayExecution(executionId: string) {
		const route = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: workflowsStore.workflowId, executionId },
		});
		window.open(route.href, '_blank');
	}

	watch(
		() => workflowsStore.workflowId,
		(_newWorkflowId, prevWorkflowId) => {
			if (prevWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return;
			}

			refreshSession();
		},
	);

	return {
		currentSessionId: computed(() => logsStore.chatSessionId),
		messages: computed(() =>
			isReadOnly ? restoredChatMessages.value : logsStore.chatSessionMessages,
		),
		previousChatMessages,
		sendMessage,
		refreshSession,
		displayExecution,
		chatTriggerNode,
		isStreamingEnabled,
		isFileUploadsAllowed,
		allowedFilesMimeTypes: allowedFilesMimeTypesComputed,
		isWorkflowReadyForChat,
		webhookUrl,
		chatOptions: chatOptionsComputed,
		registerChatWebhook,
		webhookRegistered,
		isRegistering,
	};
}
