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
			<div class="workflow-lm-chat" data-test-id="workflow-lm-chat-dialog">
				<div class="messages ignore-key-press">
					<MessagesList :messages="messages">
						<template #beforeMessage="{ message }">
							<div v-if="message.sender === 'bot'" class="message-options no-select-on-click">
								<n8n-info-tip type="tooltip" theme="info-light" tooltip-placement="right">
									<div v-if="message.id">
										<n8n-text :bold="true" size="small">
											<span @click.stop="displayExecution(message.id)">
												{{ locale.baseText('chat.window.chat.chatMessageOptions.executionId') }}:
												<a href="#" class="link">{{ message.id }}</a>
											</span>
										</n8n-text>
									</div>
								</n8n-info-tip>
							</div>
						</template>
					</MessagesList>

				</div>
				<div v-if="node && messages.length" class="logs-wrapper" data-test-id="lm-chat-logs">
					<n8n-text class="logs-title" tag="p" size="large">{{
						locale.baseText('chat.window.logs')
					}}</n8n-text>
					<div class="logs">
						<RunDataAi :key="messages.length" :node="node" hide-title slim />
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<ChatInput class="messages-input" />
			<n8n-info-tip class="mt-s">
				{{ locale.baseText('chatEmbed.infoTip.description') }}
				<a @click="uiStore.openModal(CHAT_EMBED_MODAL_KEY)">
					{{ locale.baseText('chatEmbed.infoTip.link') }}
				</a>
			</n8n-info-tip>
			<!-- <div class="workflow-lm-chat-footer">
				<n8n-input
					ref="inputField"
					v-model="currentMessage"
					class="message-input"
					type="textarea"
					:minlength="1"
					m
					:placeholder="locale.baseText('chat.window.chat.placeholder')"
					data-test-id="workflow-chat-input"
					@keydown.stop="updated"
				/>
				<n8n-tooltip :disabled="currentMessage.length > 0">
					<n8n-button
						class="send-button"
						:disabled="currentMessage === ''"
						:loading="isLoading"
						:label="locale.baseText('chat.window.chat.sendButtonText')"
						size="large"
						icon="comment"
						type="primary"
						data-test-id="workflow-chat-send-button"
						@click.stop="sendChatMessage(currentMessage)"
					/>
					<template #content>
						{{ locale.baseText('chat.window.chat.provideMessage') }}
					</template>
				</n8n-tooltip>

				<n8n-info-tip class="mt-s">
					{{ locale.baseText('chatEmbed.infoTip.description') }}
					<a @click="openChatEmbedModal">
						{{ locale.baseText('chatEmbed.infoTip.link') }}
					</a>
				</n8n-info-tip>
			</div> -->
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
import ChatInput from '@n8n/chat/components/Input.vue';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import { useI18n } from '@/composables/useI18n';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
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
import { get } from 'lodash-es';
import { isEmpty } from '@/utils/typesUtils';
import MdiContentCopy from 'virtual:icons/mdi/contentCopy';
import MdiRefresh from 'virtual:icons/mdi/refresh';

const RunDataAi = defineAsyncComponent(
	async () => await import('@/components/RunDataAi/RunDataAi.vue'),
);

// interface ChatMessage {
// 	text: string;
// 	sender: 'bot' | 'user';
// 	executionId?: string;
// }

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
// const externalHooks = useExternalHooks();
const workflowHelpers = useWorkflowHelpers({ router });
const { runWorkflow } = useRunWorkflow({ router });
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
// const aiStore = useAIStore();
const uiStore = useUIStore();

const { showError } = useToast();
const messages: Ref<ChatMessage[]> = ref([]);
const currentSessionId = ref<string>(String(Date.now()));
const isDisabled = ref(false);

const connectedNode = ref<INode | null>(null);
const chatTrigger = ref<INode | null>(null);
// const currentMessage = ref<string>('');
const modalBus = createEventBus();
const node = ref<INode | null>(null);
const previousMessageIndex = ref(0);

// const userName = computed(() => usersStore.currentUser?.firstName ?? 'there');
// const latestConnectionInfo = computed(() => aiStore.latestConnectionInfo);
const isLoading = computed(() => uiStore.isActionActive('workflowRunning'));
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
			title: 'Title!',
			footer: '',
			subtitle: '',
			inputPlaceholder: locale.baseText('aiAssistantChat.chatPlaceholder'),
			getStarted: locale.baseText('aiAssistantChat.getStarted'),
			closeButtonTooltip: locale.baseText('aiAssistantChat.closeButtonTooltip'),
		},
	},
	webhookUrl: 'https://webhook.url',
	mode: 'window',
	showWindowCloseButton: true,
	disabled: isDisabled,
	allowFileUploads,
	allowedFilesMimeTypes,
	messageActions: [
		{
			label: locale.baseText('chat.window.chat.chatMessageOptions.repostMessage'),
			sender: 'user',
			action: repostMessage,
			icon: MdiRefresh,
		},
		{
			label: locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage'),
			sender: 'user',
			icon: MdiContentCopy,
			action: reuseMessage,
		},
	],
};

const chatConfig: Chat = {
	messages,
	sendMessage,
	initialMessages: ref([]),
	currentSessionId,
	waitingForResponse: isLoading,
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
		showError(
			new Error(
				'Chat only works when an AI agent or chain(except summarization chain) is connected to the chat trigger node',
			),
			'Missing AI node',
		);
		return;
	}

	connectedNode.value = chatNode;
}

async function convertFileToBinaryData(file: File): Promise<IBinaryData> {
	const reader = new FileReader();
	return await new Promise((resolve, reject) => {
		reader.onload = () => {
			const binaryData: IBinaryData = {
				data: (reader.result as string).split('base64')?.[1] ?? '',
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

			void nextTick(() => {
				setNode();
				// this.scrollToLatestMessage();
			});
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
	if (message.trim() === '') {
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

	previousMessageIndex.value = 0;
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

function repostMessage(message: ChatMessage) {
	if (message.type === 'text') {
		void sendMessage(message.text);
	}
}
function reuseMessage(message: ChatMessage) {
	if (message.type === 'text') {
	}
	// this.currentMessage = message.text;
	// const inputField = this.$refs.inputField as HTMLInputElement;
	// inputField.focus();
}

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);
onMounted(() => {
	getTriggerNode();
	setConnectedNode();
	// this.messages = this.getChatMessages();
	setNode();
});
// export default defineComponent({
// 	name: 'WorkflowLMChat',
// 	components: {
// 		Modal,
// 		MessageTyping,
// 		RunDataAi,
// 	},
// 	setup() {
// 		const router = useRouter();
// 		const externalHooks = useExternalHooks();
// 		const workflowHelpers = useWorkflowHelpers({ router });
// 		const { runWorkflow } = useRunWorkflow({ router });

// 		return {
// 			runWorkflow,
// 			externalHooks,
// 			workflowHelpers,
// 			...useToast(),
// 			...useMessage(),
// 		};
// 	},
// 	data() {
// 		return {
// 			connectedNode: null as INodeUi | null,
// 			currentMessage: '',
// 			// messages: [] as ChatMessage[],
// 			modalBus: createEventBus(),
// 			node: null as INodeUi | null,
// 			WORKFLOW_LM_CHAT_MODAL_KEY,
// 			previousMessageIndex: 0,
// 		};
// 	},

// 	computed: {
// 		...mapStores(useWorkflowsStore, useUIStore, useNodeTypesStore),
// 		isLoading(): boolean {
// 			return this.uiStore.isActionActive('workflowRunning');
// 		},
// 	},
// 	async mounted() {
// 		this.setConnectedNode();
// 		this.messages = this.getChatMessages();
// 		this.setNode();

// 		setTimeout(() => {
// 			this.scrollToLatestMessage();
// 			const inputField = this.$refs.inputField as HTMLInputElement | null;
// 			inputField?.focus();
// 		}, 0);
// 	},
// 	methods: {
// 		displayExecution(executionId: string) {
// 			const workflow = this.workflowHelpers.getCurrentWorkflow();
// 			const route = this.$router.resolve({
// 				name: VIEWS.EXECUTION_PREVIEW,
// 				params: { name: workflow.id, executionId },
// 			});
// 			window.open(route.href, '_blank');
// 		},
// 		repostMessage(message: ChatMessage) {
// 			void this.sendChatMessage(message.text);
// 		},
// 		reuseMessage(message: ChatMessage) {
// 			this.currentMessage = message.text;
// 			const inputField = this.$refs.inputField as HTMLInputElement;
// 			inputField.focus();
// 		},
// 		updated(event: KeyboardEvent) {
// 			const pastMessages = this.workflowsStore.getPastChatMessages;
// 			if (
// 				(this.currentMessage.length === 0 || pastMessages.includes(this.currentMessage)) &&
// 				event.key === 'ArrowUp'
// 			) {
// 				const inputField = this.$refs.inputField as HTMLInputElement;

// 				inputField?.blur();
// 				this.currentMessage =
// 					pastMessages[pastMessages.length - 1 - this.previousMessageIndex] ?? '';
// 				this.previousMessageIndex = (this.previousMessageIndex + 1) % pastMessages.length;
// 				// Refocus to move the cursor to the end of the input
// 				setTimeout(() => inputField?.focus(), 0);
// 			}
// 			if (event.key === 'Enter' && !event.shiftKey && this.currentMessage) {
// 				void this.sendChatMessage(this.currentMessage);
// 				event.stopPropagation();
// 				event.preventDefault();
// 			}
// 		},
// 		async sendChatMessage(message: string) {
// 			if (this.currentMessage.trim() === '') {
// 				this.showError(
// 					new Error(locale.baseText('chat.window.chat.provideMessage')),
// 					locale.baseText('chat.window.chat.emptyChatMessage'),
// 				);
// 				return;
// 			}

// 			const pinnedChatData = usePinnedData(this.getTriggerNode());
// 			if (pinnedChatData.hasData.value) {
// 				const confirmResult = await this.confirm(
// 					locale.baseText('chat.window.chat.unpinAndExecute.description'),
// 					locale.baseText('chat.window.chat.unpinAndExecute.title'),
// 					{
// 						confirmButtonText: locale.baseText('chat.window.chat.unpinAndExecute.confirm'),
// 						cancelButtonText: locale.baseText('chat.window.chat.unpinAndExecute.cancel'),
// 					},
// 				);

// 				if (!(confirmResult === MODAL_CONFIRM)) return;

// 				pinnedChatData.unsetData('unpin-and-send-chat-message-modal');
// 			}

// 			this.messages.push({
// 				text: message,
// 				sender: 'user',
// 			} as ChatMessage);

// 			this.currentMessage = '';
// 			this.previousMessageIndex = 0;
// 			await this.$nextTick();
// 			this.scrollToLatestMessage();
// 			await this.startWorkflowWithMessage(message);
// 		},

// 		setConnectedNode() {
// 			const triggerNode = this.getTriggerNode();

// 			if (!triggerNode) {
// 				this.showError(
// 					new Error('Chat Trigger Node could not be found!'),
// 					'Trigger Node not found',
// 				);
// 				return;
// 			}
// 			const workflow = this.workflowHelpers.getCurrentWorkflow();

// 			const chatNode = this.workflowsStore.getNodes().find((node: INodeUi): boolean => {
// 				if (node.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) return false;
// 				const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
// 				if (!nodeType) return false;

// 				const isAgent =
// 					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);
// 				const isChain =
// 					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_CHAINS);

// 				let isCustomChainOrAgent = false;
// 				if (nodeType.name === AI_CODE_NODE_TYPE) {
// 					const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
// 					const inputTypes = NodeHelpers.getConnectionTypes(inputs);

// 					const outputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
// 					const outputTypes = NodeHelpers.getConnectionTypes(outputs);

// 					if (
// 						inputTypes.includes(NodeConnectionType.AiLanguageModel) &&
// 						inputTypes.includes(NodeConnectionType.Main) &&
// 						outputTypes.includes(NodeConnectionType.Main)
// 					) {
// 						isCustomChainOrAgent = true;
// 					}
// 				}

// 				if (!isAgent && !isChain && !isCustomChainOrAgent) return false;

// 				const parentNodes = workflow.getParentNodes(node.name);
// 				const isChatChild = parentNodes.some(
// 					(parentNodeName) => parentNodeName === triggerNode.name,
// 				);

// 				return Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
// 			});

// 			if (!chatNode) {
// 				this.showError(
// 					new Error(
// 						'Chat only works when an AI agent or chain(except summarization chain) is connected to the chat trigger node',
// 					),
// 					'Missing AI node',
// 				);
// 				return;
// 			}

// 			this.connectedNode = chatNode;
// 		},
// 		getChatMessages(): ChatMessage[] {
// 			if (!this.connectedNode) return [];

// 			const workflow = this.workflowHelpers.getCurrentWorkflow();
// 			const connectedMemoryInputs =
// 				workflow.connectionsByDestinationNode[this.connectedNode.name][NodeConnectionType.AiMemory];
// 			if (!connectedMemoryInputs) return [];

// 			const memoryConnection = (connectedMemoryInputs ?? []).find((i) => i.length > 0)?.[0];

// 			if (!memoryConnection) return [];

// 			const nodeResultData = this.workflowsStore.getWorkflowResultDataByNodeName(
// 				memoryConnection.node,
// 			);

// 			const memoryOutputData = (nodeResultData ?? [])
// 				.map(
// 					(data) => get(data, ['data', NodeConnectionType.AiMemory, 0, 0, 'json']) as MemoryOutput,
// 				)
// 				.find((data) => data.action === 'saveContext');

// 			return (memoryOutputData?.chatHistory ?? []).map((message) => {
// 				return {
// 					text: message.kwargs.content,
// 					sender: last(message.id) === 'HumanMessage' ? 'user' : 'bot',
// 				};
// 			});
// 		},

// 		setNode(): void {
// 			const triggerNode = this.getTriggerNode();
// 			if (!triggerNode) {
// 				return;
// 			}

// 			const workflow = this.workflowHelpers.getCurrentWorkflow();
// 			const childNodes = workflow.getChildNodes(triggerNode.name);

// 			for (const childNode of childNodes) {
// 				// Look for the first connected node with metadata
// 				// TODO: Allow later users to change that in the UI
// 				const resultData = this.workflowsStore.getWorkflowResultDataByNodeName(childNode);

// 				if (!resultData && !Array.isArray(resultData)) {
// 					continue;
// 				}

// 				if (resultData[resultData.length - 1].metadata) {
// 					this.node = this.workflowsStore.getNodeByName(childNode);
// 					break;
// 				}
// 			}
// 		},

// 		getTriggerNode(): INode | null {
// 			const workflow = this.workflowHelpers.getCurrentWorkflow();
// 			const triggerNode = workflow.queryNodes((nodeType: INodeType) =>
// 				[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(nodeType.description.name),
// 			);

// 			if (!triggerNode.length) {
// 				return null;
// 			}

// 			return triggerNode[0];
// 		},
// 		async startWorkflowWithMessage(message: string): Promise<void> {
// 			const triggerNode = this.getTriggerNode();

// 			if (!triggerNode) {
// 				this.showError(
// 					new Error('Chat Trigger Node could not be found!'),
// 					'Trigger Node not found',
// 				);
// 				return;
// 			}

// 			let inputKey = 'chatInput';
// 			if (triggerNode.type === MANUAL_CHAT_TRIGGER_NODE_TYPE && triggerNode.typeVersion < 1.1) {
// 				inputKey = 'input';
// 			}
// 			if (triggerNode.type === CHAT_TRIGGER_NODE_TYPE) {
// 				inputKey = 'chatInput';
// 			}

// 			const usersStore = useUsersStore();
// 			const currentUser = usersStore.currentUser ?? ({} as IUser);

// 			const nodeData: ITaskData = {
// 				startTime: new Date().getTime(),
// 				executionTime: 0,
// 				executionStatus: 'success',
// 				data: {
// 					main: [
// 						[
// 							{
// 								json: {
// 									sessionId: `test-${currentUser.id || 'unknown'}`,
// 									action: 'sendMessage',
// 									[inputKey]: message,
// 								},
// 							},
// 						],
// 					],
// 				},
// 				source: [null],
// 			};

// 			const response = await this.runWorkflow({
// 				triggerNode: triggerNode.name,
// 				nodeData,
// 				source: 'RunData.ManualChatMessage',
// 			});

// 			this.workflowsStore.appendChatMessage(message);
// 			if (!response) {
// 				this.showError(
// 					new Error('It was not possible to start workflow!'),
// 					'Workflow could not be started',
// 				);
// 				return;
// 			}

// 			this.waitForExecution(response.executionId);
// 		},
// 		extractResponseMessage(responseData?: IDataObject) {
// 			if (!responseData || isEmpty(responseData)) {
// 				return locale.baseText('chat.window.chat.response.empty');
// 			}

// 			// Paths where the response message might be located
// 			const paths = ['output', 'text', 'response.text'];
// 			const matchedPath = paths.find((path) => get(responseData, path));

// 			if (!matchedPath) return JSON.stringify(responseData, null, 2);

// 			return get(responseData, matchedPath) as string;
// 		},
// 		waitForExecution(executionId?: string) {
// 			const that = this;
// 			const waitInterval = setInterval(() => {
// 				if (!that.isLoading) {
// 					clearInterval(waitInterval);

// 					const lastNodeExecuted =
// 						this.workflowsStore.getWorkflowExecution?.data?.resultData.lastNodeExecuted;

// 					if (!lastNodeExecuted) return;

// 					const nodeResponseDataArray =
// 						get(
// 							this.workflowsStore.getWorkflowExecution?.data?.resultData.runData,
// 							lastNodeExecuted,
// 						) ?? [];

// 					const nodeResponseData = nodeResponseDataArray[nodeResponseDataArray.length - 1];

// 					let responseMessage: string;

// 					if (get(nodeResponseData, 'error')) {
// 						responseMessage = '[ERROR: ' + get(nodeResponseData, 'error.message') + ']';
// 					} else {
// 						const responseData = get(nodeResponseData, 'data.main[0][0].json');
// 						responseMessage = this.extractResponseMessage(responseData);
// 					}

// 					this.messages.push({
// 						text: responseMessage,
// 						sender: 'bot',
// 						executionId,
// 					} as ChatMessage);

// 					void this.$nextTick(() => {
// 						that.setNode();
// 						this.scrollToLatestMessage();
// 					});
// 				}
// 			}, 500);
// 		},
// 		scrollToLatestMessage() {
// 			const containerRef = this.$refs.messageContainer as HTMLElement[] | undefined;
// 			if (containerRef) {
// 				containerRef[containerRef.length - 1]?.scrollIntoView({
// 					behavior: 'smooth',
// 					block: 'start',
// 				});
// 			}
// 		},
// 		closeDialog() {
// 			this.modalBus.emit('close');
// 			void this.externalHooks.run('workflowSettings.dialogVisibleChanged', {
// 				dialogVisible: false,
// 			});
// 		},
// 		openChatEmbedModal() {
// 			this.uiStore.openModal(CHAT_EMBED_MODAL_KEY);
// 		},
// 	},
// });
</script>

<style scoped lang="scss">
.no-node-connected {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}
.workflow-lm-chat {
	--chat--spacing: var(--spacing-m);
	color: $custom-font-black;
	font-size: var(--font-size-s);
	display: flex;
	height: 100%;
	min-height: 400px;
	z-index: 9999;

	.logs-wrapper {
		--node-icon-color: var(--color-text-base);
		border: 1px solid var(--color-foreground-base);
		border-radius: 4px;
		height: 100%;
		overflow-y: auto;
		width: 100%;
		padding: var(--spacing-xs) 0;

		.logs-title {
			margin: 0 var(--spacing-s) var(--spacing-s);
		}
	}

	.messages {
		background-color: var(--color-lm-chat-messages-background);
		border: 1px solid var(--color-foreground-base);
		border-radius: 4px;
		height: 100%;
		width: 100%;
		overflow: hidden auto;
		padding-top: 1.5em;
		margin-right: 1em;
	}

	.message-options {
		color: #aaa;
		// display: block;
		font-size: 0.9em;
		// height: 26px;
		// position: absolute;
		// text-align: left;
		// top: -1.2em;
		// width: 120px;
		// z-index: 10;

		// .option {
		// 	cursor: pointer;
		// 	display: inline-block;
		// 	width: 28px;
		// }

		// .link {
		// 	text-decoration: underline;
		// }
	}
}
.messages-input {
	// --chat--textarea--resize: auto;
	--chat--input--border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));

	--chat--input--border-radius: var(--input-border-radius, var(--border-radius-base));
	--chat--input--send--button--background: var(
		--button-background-color,
		var(--color-button-primary-background)
	);
	--chat--input--send--button--background-hover: var(
		--button-hover-background-color,
		var(--color-button-primary-hover-active-focus-background)
	);
	--chat--input--send--button--color: var(--button-font-color, var(--color-button-primary-font));
	--chat--input--send--button--color-hover: var(--color-button-primary-font);
	[data-theme='dark'] & {
		--chat--input--background: var(--input-background-color, var(--color-foreground-xlight));
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
		--chat--input--send--button--color-hover: var(
			--button-hover-font-color,
			var(--color-button-primary-font)
		);
	}
}

.workflow-lm-chat-footer {
	.message-input {
		width: calc(100% - 8em);
	}
	.send-button {
		float: right;
	}
}
</style>
