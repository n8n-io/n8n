import type { RunWorkflowChatPayload } from '@/features/logs/composables/useChatMessaging';
import { useChatMessaging } from '@/features/logs/composables/useChatMessaging';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import { v4 as uuid } from 'uuid';
import type { Ref } from 'vue';
import { computed, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsStore } from '@/stores/logs.store';
import { restoreChatHistory } from '@/features/logs/logs.utils';
import type { INodeParameters } from 'n8n-workflow';
import { isChatNode } from '@/utils/aiUtils';

interface ChatState {
	currentSessionId: Ref<string>;
	messages: Ref<ChatMessage[]>;
	previousChatMessages: Ref<string[]>;
	sendMessage: (message: string, files?: File[]) => Promise<void>;
	refreshSession: () => void;
	displayExecution: (executionId: string) => void;
}

export function useChatState(isReadOnly: boolean): ChatState {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const logsStore = useLogsStore();
	const router = useRouter();
	const nodeHelpers = useNodeHelpers();
	const { runWorkflow } = useRunWorkflow({ router });

	const messages = ref<ChatMessage[]>([]);
	const currentSessionId = ref<string>(uuid().replace(/-/g, ''));

	const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
	const chatTriggerNode = computed(
		() => Object.values(workflowsStore.allNodes).find(isChatNode) ?? null,
	);
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

	return {
		currentSessionId,
		messages: computed(() => (isReadOnly ? restoredChatMessages.value : messages.value)),
		previousChatMessages,
		sendMessage,
		refreshSession,
		displayExecution,
	};
}
