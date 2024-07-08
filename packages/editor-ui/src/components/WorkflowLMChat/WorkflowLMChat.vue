<template>
	<Modal
		:name="WORKFLOW_LM_CHAT_MODAL_KEY"
		width="80%"
		max-height="80%"
		:title="
			locale.baseText('chat.window.title', {
				interpolate: {
					nodeName: connectedNode?.name || locale.baseText('chat.window.noChatNode'),
				},
			})
		"
		:event-bus="modalBus"
		:scrollable="false"
		@keydown.stop
	>
		<template #content>
			<div
				:class="$style.workflowLmChat"
				data-test-id="workflow-lm-chat-dialog"
				:style="messageVars"
			>
				<MessagesList :messages="messages" :class="[$style.messages, 'ignore-key-press']">
					<template #beforeMessage="{ message }">
						<MessageOptionTooltip
							v-if="message.sender === 'bot' && !message.id.includes('preload')"
							placement="right"
						>
							{{ locale.baseText('chat.window.chat.chatMessageOptions.executionId') }}:
							<a href="#" @click="displayExecution(message.id)">{{ message.id }}</a>
						</MessageOptionTooltip>

						<MessageOptionAction
							v-if="isTextMessage(message) && message.sender === 'user'"
							data-test-id="repost-message-button"
							icon="redo"
							:label="locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
							placement="left"
							@click="repostMessage(message)"
						/>

						<MessageOptionAction
							v-if="isTextMessage(message) && message.sender === 'user'"
							data-test-id="reuse-message-button"
							icon="copy"
							:label="locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage')"
							placement="left"
							@click="reuseMessage(message)"
						/>
					</template>
				</MessagesList>
				<div v-if="node" :class="$style.logsWrapper" data-test-id="lm-chat-logs">
					<n8n-text :class="$style.logsTitle" tag="p" size="large">{{
						locale.baseText('chat.window.logs')
					}}</n8n-text>
					<div :class="$style.logs">
						<RunDataAi :key="messages.length" :node="node" hide-title slim />
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<ChatInput
				:class="$style.messagesInput"
				data-test-id="lm-chat-inputs"
				@arrow-key-down="onArrowKeyDown"
			/>
			<n8n-info-tip class="mt-s">
				{{ locale.baseText('chatEmbed.infoTip.description') }}
				<a @click="uiStore.openModal(CHAT_EMBED_MODAL_KEY)">
					{{ locale.baseText('chatEmbed.infoTip.link') }}
				</a>
			</n8n-info-tip>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import { defineAsyncComponent, provide, ref, computed, onMounted, nextTick } from 'vue';
import { v4 as uuid } from 'uuid';
import Modal from '@/components/Modal.vue';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CODE_NODE_TYPE,
	AI_SUBCATEGORY,
	CHAT_EMBED_MODAL_KEY,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	VIEWS,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';

import { useUsersStore } from '@/stores/users.store';

// eslint-disable-next-line import/no-unresolved
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import type { ArrowKeyDownPayload } from '@n8n/chat/components/Input.vue';
import ChatInput from '@n8n/chat/components/Input.vue';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import type { Chat, ChatMessage, ChatMessageText, ChatOptions } from '@n8n/chat/types';
import { useI18n } from '@/composables/useI18n';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import MessageOptionTooltip from './MessageOptionTooltip.vue';
import MessageOptionAction from './MessageOptionAction.vue';

import type {
	BinaryFileType,
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	ITaskData,
	IUser,
} from 'n8n-workflow';
import {
	CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE,
	NodeConnectionType,
	NodeHelpers,
} from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useToast } from '@/composables/useToast';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createEventBus } from 'n8n-design-system';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables/useMessage';
import { usePinnedData } from '@/composables/usePinnedData';
import { get, last } from 'lodash-es';
import { isEmpty } from '@/utils/typesUtils';
import { chatEventBus } from '@n8n/chat/event-buses';

const RunDataAi = defineAsyncComponent(
	async () => await import('@/components/RunDataAi/RunDataAi.vue'),
);

// TODO: Add proper type
interface LangChainMessage {
	id: string[];
	kwargs: {
		content: string;
	};
}

interface MemoryOutput {
	action: string;
	chatHistory?: LangChainMessage[];
}

const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const { runWorkflow } = useRunWorkflow({ router });
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

const { showError } = useToast();
const messages: Ref<ChatMessage[]> = ref([]);
const currentSessionId = ref<string>(String(Date.now()));
const isDisabled = ref(false);

const connectedNode = ref<INode | null>(null);
const chatTrigger = ref<INode | null>(null);
const modalBus = createEventBus();
const node = ref<INode | null>(null);
const previousMessageIndex = ref(0);

const isLoading = computed(() => uiStore.isActionActive.workflowRunning);
const allowFileUploads = computed(() => {
	return (chatTrigger.value?.parameters?.options as INodeParameters)?.allowFileUploads === true;
});
const allowedFilesMimeTypes = computed(() => {
	return (
		(
			chatTrigger.value?.parameters?.options as INodeParameters
		)?.allowedFilesMimeTypes?.toString() ?? ''
	);
});
const locale = useI18n();

const chatOptions: ChatOptions = {
	i18n: {
		en: {
			title: '',
			footer: '',
			subtitle: '',
			inputPlaceholder: locale.baseText('chat.window.chat.placeholder'),
			getStarted: '',
			closeButtonTooltip: '',
		},
	},
	webhookUrl: '',
	mode: 'window',
	showWindowCloseButton: true,
	disabled: isDisabled,
	allowFileUploads,
	allowedFilesMimeTypes,
};

const chatConfig: Chat = {
	messages,
	sendMessage,
	initialMessages: ref([]),
	currentSessionId,
	waitingForResponse: isLoading,
};

const messageVars = {
	'--chat--message--bot--background': 'var(--color-lm-chat-bot-background)',
	'--chat--message--user--background': 'var(--color-lm-chat-user-background)',
	'--chat--message--bot--color': 'var(--color-text-dark)',
	'--chat--message--user--color': 'var(--color-lm-chat-user-color)',
	'--chat--message--bot--border': 'none',
	'--chat--message--user--border': 'none',
	'--chat--color-typing': 'var(--color-text-dark)',
};

function getTriggerNode() {
	const workflow = workflowHelpers.getCurrentWorkflow();
	const triggerNode = workflow.queryNodes((nodeType: INodeType) =>
		[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(nodeType.description.name),
	);

	if (!triggerNode.length) {
		chatTrigger.value = null;
	}

	chatTrigger.value = triggerNode[0];
}

function setNode() {
	const triggerNode = chatTrigger.value;
	if (!triggerNode) {
		return;
	}

	const workflow = workflowHelpers.getCurrentWorkflow();
	const childNodes = workflow.getChildNodes(triggerNode.name);

	for (const childNode of childNodes) {
		// Look for the first connected node with metadata
		// TODO: Allow later users to change that in the UI
		const resultData = workflowsStore.getWorkflowResultDataByNodeName(childNode);

		if (!resultData && !Array.isArray(resultData)) {
			continue;
		}

		if (resultData[resultData.length - 1].metadata) {
			node.value = workflowsStore.getNodeByName(childNode);
			break;
		}
	}
}

function setConnectedNode() {
	const triggerNode = chatTrigger.value;

	if (!triggerNode) {
		showError(new Error('Chat Trigger Node could not be found!'), 'Trigger Node not found');
		return;
	}
	const workflow = workflowHelpers.getCurrentWorkflow();

	const chatNode = workflowsStore.getNodes().find((storeNode: INodeUi): boolean => {
		if (storeNode.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) return false;
		const nodeType = nodeTypesStore.getNodeType(storeNode.type, storeNode.typeVersion);
		if (!nodeType) return false;

		const isAgent = nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);
		const isChain = nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_CHAINS);

		let isCustomChainOrAgent = false;
		if (nodeType.name === AI_CODE_NODE_TYPE) {
			const inputs = NodeHelpers.getNodeInputs(workflow, storeNode, nodeType);
			const inputTypes = NodeHelpers.getConnectionTypes(inputs);

			const outputs = NodeHelpers.getNodeOutputs(workflow, storeNode, nodeType);
			const outputTypes = NodeHelpers.getConnectionTypes(outputs);

			if (
				inputTypes.includes(NodeConnectionType.AiLanguageModel) &&
				inputTypes.includes(NodeConnectionType.Main) &&
				outputTypes.includes(NodeConnectionType.Main)
			) {
				isCustomChainOrAgent = true;
			}
		}

		if (!isAgent && !isChain && !isCustomChainOrAgent) return false;

		const parentNodes = workflow.getParentNodes(storeNode.name);
		const isChatChild = parentNodes.some((parentNodeName) => parentNodeName === triggerNode.name);

		return Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
	});

	if (!chatNode) {
		return;
	}

	connectedNode.value = chatNode;
}

async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64,')?.[1] ?? '',
				mimeType: file.type,
				fileName: file.name,
				fileSize: `${file.size} bytes`,
				fileExtension: file.name.split('.').pop() ?? '',
				fileType: file.type.split('/')[0] as BinaryFileType,
			};
			resolve(binaryData);
		};
		reader.onerror = () => {
			reject(new Error('Failed to convert file to binary data'));
		};
		reader.readAsDataURL(file);
	});
}

async function getKeyedFiles(files: File[]): Promise<IBinaryKeyData> {
	const binaryData: IBinaryKeyData = {};

	await Promise.all(
		files.map(async (file, index) => {
			const data = await convertFileToBinaryData(file);
			const key = `data${index}`;

			binaryData[key] = data;
		}),
	);

	return binaryData;
}

function extractFileMeta(file: File): IDataObject {
	return {
		fileName: file.name,
		fileSize: `${file.size} bytes`,
		fileExtension: file.name.split('.').pop() ?? '',
		fileType: file.type.split('/')[0],
		mimeType: file.type,
	};
}

async function startWorkflowWithMessage(message: string, files?: File[]): Promise<void> {
	const triggerNode = chatTrigger.value;

	if (!triggerNode) {
		showError(new Error('Chat Trigger Node could not be found!'), 'Trigger Node not found');
		return;
	}

	let inputKey = 'chatInput';
	if (triggerNode.type === MANUAL_CHAT_TRIGGER_NODE_TYPE && triggerNode.typeVersion < 1.1) {
		inputKey = 'input';
	}
	if (triggerNode.type === CHAT_TRIGGER_NODE_TYPE) {
		inputKey = 'chatInput';
	}

	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser ?? ({} as IUser);

	const inputPayload: INodeExecutionData = {
		json: {
			sessionId: `test-${currentUser.id || 'unknown'}`,
			action: 'sendMessage',
			[inputKey]: message,
		},
	};

	if (files && files.length > 0) {
		const filesMeta = files.map((file) => extractFileMeta(file));
		const binaryData = await getKeyedFiles(files);

		inputPayload.json.files = filesMeta;
		inputPayload.binary = binaryData;
	}
	const nodeData: ITaskData = {
		startTime: new Date().getTime(),
		executionTime: 0,
		executionStatus: 'success',
		data: {
			main: [[inputPayload]],
		},
		source: [null],
	};

	const response = await runWorkflow({
		triggerNode: triggerNode.name,
		nodeData,
		source: 'RunData.ManualChatMessage',
	});

	workflowsStore.appendChatMessage(message);
	if (!response) {
		showError(new Error('It was not possible to start workflow!'), 'Workflow could not be started');
		return;
	}

	waitForExecution(response.executionId);
}

function waitForExecution(executionId?: string) {
	const waitInterval = setInterval(() => {
		if (!isLoading.value) {
			clearInterval(waitInterval);

			const lastNodeExecuted =
				workflowsStore.getWorkflowExecution?.data?.resultData.lastNodeExecuted;

			if (!lastNodeExecuted) return;

			const nodeResponseDataArray =
				get(workflowsStore.getWorkflowExecution?.data?.resultData.runData, lastNodeExecuted) ?? [];

			const nodeResponseData = nodeResponseDataArray[nodeResponseDataArray.length - 1];

			let responseMessage: string;

			if (get(nodeResponseData, 'error')) {
				responseMessage = '[ERROR: ' + get(nodeResponseData, 'error.message') + ']';
			} else {
				const responseData = get(nodeResponseData, 'data.main[0][0].json');
				responseMessage = extractResponseMessage(responseData);
			}

			messages.value.push({
				text: responseMessage,
				sender: 'bot',
				createdAt: new Date().toISOString(),
				id: executionId ?? uuid(),
			});

			void nextTick(setNode);
		}
	}, 500);
}

function extractResponseMessage(responseData?: IDataObject) {
	if (!responseData || isEmpty(responseData)) {
		return locale.baseText('chat.window.chat.response.empty');
	}

	// Paths where the response message might be located
	const paths = ['output', 'text', 'response.text'];
	const matchedPath = paths.find((path) => get(responseData, path));

	if (!matchedPath) return JSON.stringify(responseData, null, 2);

	return get(responseData, matchedPath) as string;
}

async function sendMessage(message: string, files?: File[]) {
	previousMessageIndex.value = 0;
	if (message.trim() === '' && (!files || files.length === 0)) {
		showError(
			new Error(locale.baseText('chat.window.chat.provideMessage')),
			locale.baseText('chat.window.chat.emptyChatMessage'),
		);
		return;
	}

	const pinnedChatData = usePinnedData(chatTrigger.value);
	if (pinnedChatData.hasData.value) {
		const confirmResult = await useMessage().confirm(
			locale.baseText('chat.window.chat.unpinAndExecute.description'),
			locale.baseText('chat.window.chat.unpinAndExecute.title'),
			{
				confirmButtonText: locale.baseText('chat.window.chat.unpinAndExecute.confirm'),
				cancelButtonText: locale.baseText('chat.window.chat.unpinAndExecute.cancel'),
			},
		);

		if (!(confirmResult === MODAL_CONFIRM)) return;

		pinnedChatData.unsetData('unpin-and-send-chat-message-modal');
	}

	const newMessage: ChatMessage = {
		text: message,
		sender: 'user',
		createdAt: new Date().toISOString(),
		id: uuid(),
		files,
	};
	messages.value.push(newMessage);

	await startWorkflowWithMessage(newMessage.text, files);
}

function displayExecution(executionId: string) {
	const workflow = workflowHelpers.getCurrentWorkflow();
	const route = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { name: workflow.id, executionId },
	});
	window.open(route.href, '_blank');
}
function isTextMessage(message: ChatMessage): message is ChatMessageText {
	return message.type === 'text' || !message.type;
}

function repostMessage(message: ChatMessageText) {
	void sendMessage(message.text);
}
function reuseMessage(message: ChatMessageText) {
	chatEventBus.emit('setInputValue', message.text);
}

function getChatMessages(): ChatMessageText[] {
	if (!connectedNode.value) return [];

	const workflow = workflowHelpers.getCurrentWorkflow();
	const connectedMemoryInputs =
		workflow.connectionsByDestinationNode[connectedNode.value.name][NodeConnectionType.AiMemory];
	if (!connectedMemoryInputs) return [];

	const memoryConnection = (connectedMemoryInputs ?? []).find((i) => i.length > 0)?.[0];

	if (!memoryConnection) return [];

	const nodeResultData = workflowsStore.getWorkflowResultDataByNodeName(memoryConnection.node);

	const memoryOutputData = (nodeResultData ?? [])
		.map((data) => get(data, ['data', NodeConnectionType.AiMemory, 0, 0, 'json']) as MemoryOutput)
		.find((data) => data.action === 'saveContext');

	return (memoryOutputData?.chatHistory ?? []).map((message, index) => {
		return {
			createdAt: new Date().toISOString(),
			text: message.kwargs.content,
			id: `preload__${index}`,
			sender: last(message.id) === 'HumanMessage' ? 'user' : 'bot',
		};
	});
}

function onArrowKeyDown({ currentInputValue, key }: ArrowKeyDownPayload) {
	const pastMessages = workflowsStore.getPastChatMessages;
	const isCurrentInputEmptyOrMatch =
		currentInputValue.length === 0 || pastMessages.includes(currentInputValue);

	if (isCurrentInputEmptyOrMatch && (key === 'ArrowUp' || key === 'ArrowDown')) {
		// Blur the input when the user presses the up or down arrow key
		chatEventBus.emit('blurInput');

		if (pastMessages.length === 1) {
			previousMessageIndex.value = 0;
		} else if (key === 'ArrowUp') {
			previousMessageIndex.value = (previousMessageIndex.value + 1) % pastMessages.length;
		} else if (key === 'ArrowDown') {
			previousMessageIndex.value =
				(previousMessageIndex.value - 1 + pastMessages.length) % pastMessages.length;
		}

		chatEventBus.emit(
			'setInputValue',
			pastMessages[pastMessages.length - 1 - previousMessageIndex.value] ?? '',
		);

		// Refocus to move the cursor to the end of the input
		chatEventBus.emit('focusInput');
	}
}

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);
onMounted(() => {
	getTriggerNode();
	setConnectedNode();
	messages.value = getChatMessages();
	setNode();

	setTimeout(() => chatEventBus.emit('focusInput'), 0);
});
</script>

<style lang="scss">
.chat-message-markdown ul,
.chat-message-markdown ol {
	padding: 0 0 0 1em;
}
</style>
<style module lang="scss">
.no-node-connected {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}
.workflowLmChat {
	--chat--spacing: var(--spacing-m);
	--chat--message--padding: var(--spacing-xs);

	display: flex;
	height: 100%;
	z-index: 9999;
	min-height: 10rem;

	@media (min-height: 34rem) {
		min-height: 14.5rem;
	}
	@media (min-height: 47rem) {
		min-height: 25rem;
	}
	& ::-webkit-scrollbar {
		width: 4px;
	}

	& ::-webkit-scrollbar-thumb {
		border-radius: var(--border-radius-base);
		background: var(--color-foreground-dark);
		border: 1px solid white;
	}

	& ::-webkit-scrollbar-thumb:hover {
		background: var(--color-foreground-xdark);
	}
}

.logsWrapper {
	--node-icon-color: var(--color-text-base);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	height: 100%;
	overflow: auto;
	width: 100%;
	padding: var(--spacing-xs) 0;
}

.logsTitle {
	margin: 0 var(--spacing-s) var(--spacing-s);
}

.messages {
	background-color: var(--color-lm-chat-messages-background);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	height: 100%;
	width: 100%;
	overflow: auto;
	padding-top: 1.5em;

	&:not(:last-child) {
		margin-right: 1em;
	}

	& * {
		font-size: var(--font-size-s);
	}
}
.messagesInput {
	--chat--input--border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));

	--chat--input--border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
	--chat--input--send--button--background: transparent;
	--chat--input--send--button--color: var(--color-button-secondary-font);
	--chat--input--send--button--color-hover: var(--color-primary);
	--chat--input--border-active: var(--input-focus-border-color, var(--color-secondary));
	--chat--files-spacing: var(--spacing-2xs) 0;
	--chat--input--background: var(--color-lm-chat-bot-background);

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}

	border-bottom-right-radius: var(--border-radius-base);
	border-top-right-radius: var(--border-radius-base);
	overflow: hidden;
}
</style>
