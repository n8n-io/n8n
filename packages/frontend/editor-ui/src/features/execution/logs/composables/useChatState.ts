import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import MessageWithButtons from '@n8n/chat/components/MessageWithButtons.vue';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage, ChatOptions, SendMessageResponse } from '@n8n/chat/types';
import { v4 as uuid } from 'uuid';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref, toValue, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsStore } from '@/app/stores/logs.store';
import { restoreChatHistory } from '@/features/execution/logs/logs.utils';
import { type INode, type INodeParameters, NodeHelpers } from 'n8n-workflow';
import { isChatNode } from '@/app/utils/aiUtils';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { MessageComponentKey } from '@n8n/chat/constants/messageComponents';

interface ChatState {
	currentSessionId: ComputedRef<string>;
	messages: ComputedRef<ChatMessage[]>;
	previousChatMessages: ComputedRef<string[]>;
	refreshSession: () => void;
	displayExecution: (executionId: string) => void;
	chatTriggerNode: ComputedRef<INode | null>;
	isStreamingEnabled: ComputedRef<boolean>;
	isFileUploadsAllowed: ComputedRef<boolean>;
	allowedFilesMimeTypes: ComputedRef<string | undefined>;
	isWorkflowReadyForChat: ComputedRef<boolean>;
	webhookUrl: ComputedRef<string>;
	chatOptions: ComputedRef<ChatOptions>;
	registerChatWebhook: () => Promise<void>;
	webhookRegistered: Ref<boolean>;
	isRegistering: Ref<boolean>;
}

export function useChatState(
	isReadOnly: boolean,
	sessionId?: Ref<string | undefined> | (() => string | undefined),
): ChatState {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const rootStore = useRootStore();
	const logsStore = useLogsStore();
	const router = useRouter();
	const nodeHelpers = useNodeHelpers();
	const nodeTypesStore = useNodeTypesStore();
	const { runWorkflow } = useRunWorkflow({ router });

	const webhookRegistered = ref(false);
	const isRegistering = ref(false);
	const messages = computed(() => logsStore.chatSessionMessages);
	const currentSessionId = computed(() => logsStore.chatSessionId);

	// Use provided sessionId or fall back to logsStore sessionId
	const effectiveSessionId = computed(() => toValue(sessionId) ?? currentSessionId.value);

	const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
	const chatTriggerNode = computed(() => workflowsStore.allNodes.find(isChatNode) ?? null);

	// Resolve the effective value for an options sub-parameter: returns the
	// user-set value if present, otherwise the default from the node type
	// definition (respecting displayOptions at both collection and parameter
	// level, e.g. responseMode default varies based on availableInChat).
	const getOptionsValue = <T>(parameterName: string): T | undefined => {
		const node = chatTriggerNode.value;
		const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;

		if (!node || !nodeType) {
			return undefined;
		}

		// Resolve full root parameters with defaults so displayOptions checks
		// work even when optional parameters aren't explicitly set.
		const resolvedParams =
			NodeHelpers.getNodeParameters(
				nodeType.properties,
				node.parameters,
				true,
				false,
				node,
				nodeType,
			) ?? {};
		const optionsValues = (resolvedParams.options ?? {}) as INodeParameters;

		// Use the user set value if present
		if (parameterName in optionsValues) {
			return optionsValues[parameterName] as T;
		}

		// Otherwise find the default from the active parameter definition
		const optionsParam = nodeType.properties.find(
			(prop) =>
				prop.name === 'options' &&
				prop.type === 'collection' &&
				NodeHelpers.displayParameter(resolvedParams, prop, node, nodeType),
		);

		for (const opt of optionsParam?.options ?? []) {
			if (opt.name !== parameterName || !('default' in opt)) continue;

			if (NodeHelpers.displayParameter(optionsValues, opt, node, nodeType, resolvedParams)) {
				return opt.default as T;
			}
		}

		return undefined;
	};

	// Check if streaming is enabled in ChatTrigger node
	const isStreamingEnabled = computed<boolean>(
		() => getOptionsValue<string>('responseMode') === 'streaming',
	);

	// Check if file uploads are allowed in ChatTrigger node
	const isFileUploadsAllowed = computed<boolean>(
		() => getOptionsValue('allowFileUploads') === true,
	);

	// Get allowed file MIME types from ChatTrigger node
	const allowedFilesMimeTypesComputed = computed<string | undefined>(() =>
		getOptionsValue<string>('allowedFilesMimeTypes'),
	);

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
			// Clear any existing execution to allow fresh webhook registration
			workflowState.setWorkflowExecutionData(null);
			workflowState.setActiveExecutionId(undefined);

			// Use the useRunWorkflow composable to properly register the webhook
			// Only include destinationNode if set for partial execution support
			const runWorkflowOptions: Parameters<typeof runWorkflow>[0] = {
				triggerNode: chatTriggerNode.value.name,
				source: 'RunData.ManualChatTrigger',
				sessionId: effectiveSessionId.value,
			};

			if (workflowsStore.chatPartialExecutionDestinationNode) {
				runWorkflowOptions.destinationNode = {
					nodeName: workflowsStore.chatPartialExecutionDestinationNode,
					mode: 'inclusive',
				};
				// Clear after use so subsequent messages run full workflow
				workflowsStore.chatPartialExecutionDestinationNode = null;
			}

			await runWorkflow(runWorkflowOptions);

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
			messageComponents: {
				[MessageComponentKey.WITH_BUTTONS]: MessageWithButtons,
			},
			messageHistory: messages.value,
			disabled: ref(isReadOnly),
			i18n: {
				en: {
					title: locale.baseText('chat.window.title') || 'Chat',
					repostButton:
						locale.baseText('chat.window.chat.chatMessageOptions.repostMessage') ||
						'Repost message',
					reuseButton:
						locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage') || 'Reuse message',
					subtitle: '',
					footer: '',
					getStarted: '',
					inputPlaceholder:
						locale.baseText('chat.window.chat.placeholder') || 'Type your message...',
					closeButtonTooltip: '',
				},
			},
			beforeMessageSent: async (message: string) => {
				if (!isReadOnly) {
					// Register fresh webhook before each message to ensure it's active
					// This gives us a fresh webhook with full timeout for each message
					await registerChatWebhook();

					// Store user message for persistence
					logsStore.addChatMessage({
						id: uuid(),
						text: message,
						sender: 'user',
					});
				}
			},
			afterMessageSent: (_message: string, response?: SendMessageResponse) => {
				// Store bot response for persistence
				if (isReadOnly || !response) {
					return;
				}

				if (response.hasReceivedChunks) {
					const message = response.message;
					// In streaming mode, store the completed message
					if (message && typeof message === 'object' && 'text' in message) {
						logsStore.addChatMessage({
							id: message.id,
							text: message.text,
							sender: 'bot',
						});
					}
					return;
				}

				// Extract bot message from non-streaming response
				const botMessage = response.output ?? response.text ?? response.message;
				logsStore.addChatMessage({
					id: uuid(),
					text: typeof botMessage === 'string' ? botMessage : JSON.stringify(response),
					sender: 'bot',
				});
			},
		};
		return options;
	});

	const restoredChatMessages = computed(() =>
		restoreChatHistory(
			workflowsStore.workflowExecutionData,
			locale.baseText('chat.window.chat.response.empty'),
		),
	);

	function refreshSession() {
		workflowState.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
		logsStore.resetChatSessionId();
		logsStore.resetMessages();
		// Clear partial execution destination to allow full workflow execution
		workflowsStore.chatPartialExecutionDestinationNode = null;

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
			if (!prevWorkflowId) {
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
