import { defineStore } from 'pinia';
import * as aiApi from '@/api/ai';
import type { DebugErrorPayload, DebugChatPayload } from '@/api/ai';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage } from '@n8n/chat/types';
import { computed, nextTick, ref } from 'vue';
import { jsonParse, type IUser, type NodeError } from 'n8n-workflow';
import { useUsersStore } from './users.store';
import { useNDVStore } from './ndv.store';
import { useWorkflowsStore } from './workflows.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';

export const useAIStore = defineStore('ai', () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const currentSessionId = ref<string>('Whatever');
	const waitingForResponse = ref(false);
	const chatTitle = ref('');

	const userName = computed(() => usersStore.currentUser?.firstName ?? 'there');

	const initialMessages = ref<ChatMessage[]>([
		{
			id: '1',
			type: 'text',
			sender: 'bot',
			createdAt: new Date().toISOString(),
			text: `Hi ${userName.value}! I have a few ideas on what the issue might be. Here's my top suggestion 👇`,
		},
		// {
		// 	id: '1',
		// 	type: 'component',
		// 	key: 'MessageWithActions',
		// 	sender: 'bot',
		// 	createdAt: new Date().toISOString(),
		// 	arguments: {
		// 		message: 'Hello, I am a bot. How can I help you?',
		// 		actions: [
		// 			{ label: 'Fix issues', action: 'fix_issues' },
		// 			{ label: 'Generate node', action: 'generate_node' },
		// 		],
		// 		onActionSelected({ action, label }: { action: string; label: string }) {
		// 			// console.log('🚀 ~ onActionSelected ~ action:', action);
		// 			void sendMessage(label);
		// 		},
		// 	},
		// },
	]);

	const messages = ref<ChatMessage[]>([
		{
			id: '2',
			type: 'component',
			key: 'QuickReplies',
			sender: 'user',
			createdAt: new Date().toISOString(),
			transparent: true,
			arguments: {
				suggestions: [
					{ label: 'Give me more suggestions', key: 'get_more' },
					{ label: 'Ask a question about my node issues', key: 'ask_question' },
				],
				onReplySelected: ({ label, key }: { key: string; label: string }) => {
					messages.value = messages.value.filter(
						(message) => message.type !== 'component' || message.key !== 'QuickReplies',
					);
					void sendMessage(label);
				},
			},
		},
	]);

	async function sendMessage(text: string) {
		messages.value.push({
			createdAt: new Date().toISOString(),
			text,
			sender: 'user',
			id: Math.random().toString(),
		});

		chatEventBus.emit('scrollToBottom');

		void debugChat({ error: new Error('Whatever'), text, sessionId: currentSessionId.value });
	}

	const isErrorDebuggingEnabled = computed(() => settingsStore.settings.ai.errorDebugging);

	async function debugError(payload: DebugErrorPayload) {
		return await aiApi.debugError(rootStore.getRestApiContext, payload);
	}
	function getLastMessage() {
		return messages.value[messages.value.length - 1];
	}
	function onMessageReceived(messageChunk: string) {
		waitingForResponse.value = false;
		if (messageChunk.length === 0) return;
		if (messageChunk === '__END__') return;

		if (getLastMessage()?.sender !== 'bot') {
			messages.value.push({
				createdAt: new Date().toISOString(),
				text: messageChunk,
				sender: 'bot',
				type: 'text',
				id: Math.random().toString(),
			});
			return;
		}

		const lastMessage = getLastMessage();

		if (lastMessage.type === 'text') {
			lastMessage.text += messageChunk.replaceAll('\\n', '\n');
			chatEventBus.emit('scrollToBottom');
		}
	}
	async function onMessageSuggestionReceived(messageChunk: string) {
		waitingForResponse.value = false;
		if (messageChunk.length === 0) return;
		if (messageChunk === '__END__') {
			const lastMessage = getLastMessage();
			// If last message is a component, then show the follow-up actions
			if (lastMessage.type === 'component') {
				const followUpQuestion: string = lastMessage.arguments.suggestions[0].followUpQuestion;
				// TODO: Think about using MessageWithActions instead of text + QuickReplies
				messages.value.push({
					createdAt: new Date().toISOString(),
					sender: 'bot',
					type: 'text',
					id: Math.random().toString(),
					text: followUpQuestion,
				});
				const followUpActions = lastMessage.arguments.suggestions.map((suggestion) => {
					return {
						label: suggestion.followUpAction,
						key: suggestion.followUpAction,
					};
				});
				followUpActions.push({ label: 'No, try another suggestion', key: 'ask_question' });
				const newMessageId = Math.random().toString();
				messages.value.push({
					createdAt: new Date().toISOString(),
					transparent: true,
					key: 'QuickReplies',
					sender: 'bot',
					type: 'component',
					id: newMessageId,
					arguments: {
						suggestions: followUpActions,
						async onReplySelected({ label }: { action: string; label: string }) {
							await sendMessage(label);
							// Remove the quick replies so only user message is shown
							messages.value = messages.value.filter((message) => {
								return message.id !== newMessageId;
							});
						},
					},
				});
				chatEventBus.emit('scrollToBottom');
			}
			return;
		}

		const parsedMessage = jsonParse<Record<string, unknown>>(messageChunk);
		if (getLastMessage()?.sender !== 'bot') {
			messages.value.push({
				createdAt: new Date().toISOString(),
				sender: 'bot',
				key: 'MessageWithSuggestions',
				type: 'component',
				id: Math.random().toString(),
				arguments: {
					...parsedMessage,
				},
			});
			chatEventBus.emit('scrollToBottom');
			return;
		}

		const lastMessage = getLastMessage();

		if (lastMessage.type === 'component') {
			lastMessage.arguments = parsedMessage;
			await nextTick();
			await nextTick();
			chatEventBus.emit('scrollToBottom');
		}
	}

	async function debugChat(payload: DebugChatPayload) {
		waitingForResponse.value = true;
		return await aiApi.debugChat(rootStore.getRestApiContext, payload, onMessageSuggestionReceived);
	}

	async function startNewDebugSession(error: NodeError) {
		const currentNode = useNDVStore().activeNode;
		const workflowNodes = useWorkflowsStore().allNodes;

		const schemas = workflowNodes.map((node) => {
			const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
			const schema = getSchemaForExecutionData(
				executionDataToJson(getInputDataWithPinned(node)),
				true,
			);
			return {
				node_name: node.name,
				schema,
			};
		});

		const currentNodeParameters = currentNode?.parameters ?? {};
		const currentUser = usersStore.currentUser ?? ({} as IUser);
		// return;
		messages.value = [];
		currentSessionId.value = `${currentUser.id}-${error.timestamp}`;
		chatTitle.value = error.message;
		delete error.stack;
		chatEventBus.emit('open');

		const promptText = `
			## Error:
				${JSON.stringify(error).trim()};
		`;

		return await aiApi.debugChat(
			rootStore.getRestApiContext,
			{
				error,
				sessionId: currentSessionId.value,
				schemas,
				nodes: workflowNodes.map((n) => n.name),
				parameters: currentNodeParameters,
			},
			onMessageSuggestionReceived,
		);
	}
	return {
		debugError,
		startNewDebugSession,
		sendMessage,
		chatTitle,
		isErrorDebuggingEnabled,
		messages,
		initialMessages,
		waitingForResponse,
	};
});
