<template>
	<Modal
		:name="WORKFLOW_LM_CHAT_MODAL_KEY"
		width="80%"
		max-height="80%"
		:title="
			$locale.baseText('chat.window.title', {
				interpolate: {
					nodeName: connectedNode?.name || $locale.baseText('chat.window.noChatNode'),
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
					<div
						v-for="message in messages"
						:key="`${message.executionId}__${message.sender}`"
						ref="messageContainer"
						:class="['message', message.sender]"
					>
						<div :class="['content', message.sender]">
							{{ message.text }}

							<div class="message-options no-select-on-click">
								<n8n-info-tip
									v-if="message.sender === 'bot'"
									type="tooltip"
									theme="info-light"
									tooltip-placement="right"
								>
									<div v-if="message.executionId">
										<n8n-text :bold="true" size="small">
											<span @click.stop="displayExecution(message.executionId)">
												{{ $locale.baseText('chat.window.chat.chatMessageOptions.executionId') }}:
												<a href="#" class="link">{{ message.executionId }}</a>
											</span>
										</n8n-text>
									</div>
								</n8n-info-tip>

								<div
									v-if="message.sender === 'user'"
									class="option"
									:title="$locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
									data-test-id="repost-message-button"
									@click="repostMessage(message)"
								>
									<font-awesome-icon icon="redo" />
								</div>
								<div
									v-if="message.sender === 'user'"
									class="option"
									:title="$locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage')"
									data-test-id="reuse-message-button"
									@click="reuseMessage(message)"
								>
									<font-awesome-icon icon="copy" />
								</div>
							</div>
						</div>
					</div>
					<MessageTyping ref="messageContainer" v-if="isLoading" />
				</div>
				<div v-if="node" class="logs-wrapper" data-test-id="lm-chat-logs">
					<n8n-text class="logs-title" tag="p" size="large">{{
						$locale.baseText('chat.window.logs')
					}}</n8n-text>
					<div class="logs">
						<RunDataAi :key="messages.length" :node="node" hide-title slim />
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div class="workflow-lm-chat-footer">
				<n8n-input
					ref="inputField"
					v-model="currentMessage"
					class="message-input"
					type="textarea"
					:minlength="1"
					m
					:placeholder="$locale.baseText('chat.window.chat.placeholder')"
					data-test-id="workflow-chat-input"
					@keydown.stop="updated"
				/>
				<n8n-tooltip :disabled="currentMessage.length > 0">
					<n8n-button
						class="send-button"
						:disabled="currentMessage === ''"
						:loading="isLoading"
						:label="$locale.baseText('chat.window.chat.sendButtonText')"
						size="large"
						icon="comment"
						type="primary"
						data-test-id="workflow-chat-send-button"
						@click.stop="sendChatMessage(currentMessage)"
					/>
					<template #content>
						{{ $locale.baseText('chat.window.chat.provideMessage') }}
					</template>
				</n8n-tooltip>

				<n8n-info-tip class="mt-s">
					{{ $locale.baseText('chatEmbed.infoTip.description') }}
					<a @click="openChatEmbedModal">
						{{ $locale.baseText('chatEmbed.infoTip.link') }}
					</a>
				</n8n-info-tip>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from 'vue';
import { mapStores } from 'pinia';

import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CODE_NODE_TYPE,
	AI_SUBCATEGORY,
	CHAT_EMBED_MODAL_KEY,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	VIEWS,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';

import { workflowRun } from '@/mixins/workflowRun';
import { get, last } from 'lodash-es';

import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from 'n8n-design-system/utils';
import type { IDataObject, INodeType, INode, ITaskData } from 'n8n-workflow';
import { NodeHelpers, NodeConnectionType } from 'n8n-workflow';
import type { INodeUi, IUser } from '@/Interface';
import { useExternalHooks } from '@/composables/useExternalHooks';

// eslint-disable-next-line import/no-unresolved
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';

const RunDataAi = defineAsyncComponent(async () => import('@/components/RunDataAi/RunDataAi.vue'));

interface ChatMessage {
	text: string;
	sender: 'bot' | 'user';
	executionId?: string;
}

// TODO: Add proper type
interface LangChainMessage {
	id: string[];
	kwargs: {
		content: string;
	};
}

// TODO:
// - display additional information like execution time, tokens used, ...
// - display errors better
export default defineComponent({
	name: 'WorkflowLMChat',
	components: {
		Modal,
		MessageTyping,
		RunDataAi,
	},
	mixins: [workflowRun],
	setup(props, ctx) {
		const externalHooks = useExternalHooks();

		return {
			externalHooks,
			...useToast(),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...workflowRun.setup?.(props, ctx),
		};
	},
	data() {
		return {
			connectedNode: null as INodeUi | null,
			currentMessage: '',
			messages: [] as ChatMessage[],
			modalBus: createEventBus(),
			node: null as INodeUi | null,
			WORKFLOW_LM_CHAT_MODAL_KEY,
		};
	},

	computed: {
		...mapStores(useWorkflowsStore, useUIStore),
		isLoading(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
	},
	async mounted() {
		this.setConnectedNode();
		this.messages = this.getChatMessages();
		this.setNode();
	},
	methods: {
		displayExecution(executionId: string) {
			const workflow = this.getCurrentWorkflow();
			const route = this.$router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: workflow.id, executionId },
			});
			window.open(route.href, '_blank');
		},
		repostMessage(message: ChatMessage) {
			void this.sendChatMessage(message.text);
		},
		reuseMessage(message: ChatMessage) {
			this.currentMessage = message.text;
			const inputField = this.$refs.inputField as HTMLInputElement;
			inputField.focus();
		},
		updated(event: KeyboardEvent) {
			if (event.key === 'Enter' && !event.shiftKey && this.currentMessage) {
				void this.sendChatMessage(this.currentMessage);
				event.stopPropagation();
				event.preventDefault();
			}
		},
		async sendChatMessage(message: string) {
			if (this.currentMessage.trim() === '') {
				this.showError(
					new Error(this.$locale.baseText('chat.window.chat.provideMessage')),
					this.$locale.baseText('chat.window.chat.emptyChatMessage'),
				);
				return;
			}
			this.messages.push({
				text: message,
				sender: 'user',
			} as ChatMessage);

			this.currentMessage = '';
			await this.$nextTick();
			this.scrollToLatestMessage();
			await this.startWorkflowWithMessage(message);
		},

		setConnectedNode() {
			const triggerNode = this.getTriggerNode();

			if (!triggerNode) {
				this.showError(
					new Error('Chat Trigger Node could not be found!'),
					'Trigger Node not found',
				);
				return;
			}
			const workflow = this.getCurrentWorkflow();

			const chatNode = this.workflowsStore.getNodes().find((node: INodeUi): boolean => {
				const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (!nodeType) return false;

				const isAgent =
					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);
				const isChain =
					nodeType.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_CHAINS);

				let isCustomChainOrAgent = false;
				if (nodeType.name === AI_CODE_NODE_TYPE) {
					const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
					const inputTypes = NodeHelpers.getConnectionTypes(inputs);

					const outputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
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

				const parentNodes = workflow.getParentNodes(node.name);
				const isChatChild = parentNodes.some(
					(parentNodeName) => parentNodeName === triggerNode.name,
				);

				return Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
			});

			if (!chatNode) {
				this.showError(
					new Error(
						'Chat only works when an AI agent or chain is connected to the chat trigger node',
					),
					'Missing AI node',
				);
				return;
			}

			this.connectedNode = chatNode;
		},
		getChatMessages(): ChatMessage[] {
			if (!this.connectedNode) return [];

			const workflow = this.getCurrentWorkflow();
			const connectedMemoryInputs =
				workflow.connectionsByDestinationNode[this.connectedNode.name][NodeConnectionType.AiMemory];
			if (!connectedMemoryInputs) return [];

			const memoryConnection = (connectedMemoryInputs ?? []).find((i) => i.length > 0)?.[0];

			if (!memoryConnection) return [];

			const nodeResultData = this.workflowsStore?.getWorkflowResultDataByNodeName(
				memoryConnection.node,
			);

			const memoryOutputData = nodeResultData
				?.map(
					(
						data,
					): {
						action: string;
						chatHistory?: unknown[];
						response?: {
							sessionId?: unknown[];
						};
					} => get(data, ['data', NodeConnectionType.AiMemory, 0, 0, 'json'])!,
				)
				?.find((data) =>
					['chatHistory', 'loadMemoryVariables'].includes(data?.action) ? data : undefined,
				);

			let chatHistory: LangChainMessage[];
			if (memoryOutputData?.chatHistory) {
				chatHistory = memoryOutputData?.chatHistory as LangChainMessage[];
			} else if (memoryOutputData?.response) {
				chatHistory = memoryOutputData?.response.sessionId as LangChainMessage[];
			} else {
				return [];
			}

			return (chatHistory || []).map((message) => {
				return {
					text: message.kwargs.content,
					sender: last(message.id) === 'HumanMessage' ? 'user' : 'bot',
				};
			});
		},

		setNode(): void {
			const triggerNode = this.getTriggerNode();
			if (!triggerNode) {
				return;
			}

			const workflow = this.getCurrentWorkflow();
			const childNodes = workflow.getChildNodes(triggerNode.name);

			for (const childNode of childNodes) {
				// Look for the first connected node with metadata
				// TODO: Allow later users to change that in the UI
				const resultData = this.workflowsStore.getWorkflowResultDataByNodeName(childNode);

				if (!resultData && !Array.isArray(resultData)) {
					continue;
				}

				if (resultData[resultData.length - 1].metadata) {
					this.node = this.workflowsStore.getNodeByName(childNode);
					break;
				}
			}
		},

		getTriggerNode(): INode | null {
			const workflow = this.getCurrentWorkflow();
			const triggerNode = workflow.queryNodes((nodeType: INodeType) =>
				[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(nodeType.description.name),
			);

			if (!triggerNode.length) {
				return null;
			}

			return triggerNode[0];
		},
		async startWorkflowWithMessage(message: string): Promise<void> {
			const triggerNode = this.getTriggerNode();

			if (!triggerNode) {
				this.showError(
					new Error('Chat Trigger Node could not be found!'),
					'Trigger Node not found',
				);
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

			const nodeData: ITaskData = {
				startTime: new Date().getTime(),
				executionTime: 0,
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									sessionId: `test-${currentUser.id || 'unknown'}`,
									action: 'sendMessage',
									[inputKey]: message,
								},
							},
						],
					],
				},
				source: [null],
			};

			const response = await this.runWorkflow({
				triggerNode: triggerNode.name,
				nodeData,
				source: 'RunData.ManualChatMessage',
			});

			if (!response) {
				this.showError(
					new Error('It was not possible to start workflow!'),
					'Workflow could not be started',
				);
				return;
			}

			this.waitForExecution(response.executionId);
		},
		extractResponseMessage(responseData?: IDataObject) {
			if (!responseData) return '<NO RESPONSE FOUND>';

			// Paths where the response message might be located
			const paths = ['output', 'text', 'response.text'];
			const matchedPath = paths.find((path) => get(responseData, path));

			if (!matchedPath) return JSON.stringify(responseData, null, 2);

			return get(responseData, matchedPath) as string;
		},
		waitForExecution(executionId?: string) {
			const that = this;
			const waitInterval = setInterval(() => {
				if (!that.isLoading) {
					clearInterval(waitInterval);

					const lastNodeExecuted =
						this.workflowsStore.getWorkflowExecution?.data?.resultData.lastNodeExecuted;

					const nodeResponseDataArray = get(
						this.workflowsStore.getWorkflowExecution?.data?.resultData.runData,
						`[${lastNodeExecuted}]`,
					) as ITaskData[];

					const nodeResponseData = nodeResponseDataArray[nodeResponseDataArray.length - 1];

					let responseMessage: string;

					if (get(nodeResponseData, ['error'])) {
						responseMessage = '[ERROR: ' + get(nodeResponseData, ['error', 'message']) + ']';
					} else {
						const responseData = get(nodeResponseData, 'data.main[0][0].json');
						responseMessage = this.extractResponseMessage(responseData);
					}

					this.messages.push({
						text: responseMessage,
						sender: 'bot',
						executionId,
					} as ChatMessage);

					void this.$nextTick(() => {
						that.setNode();
						this.scrollToLatestMessage();
					});
				}
			}, 500);
		},
		scrollToLatestMessage() {
			const containerRef = this.$refs.messageContainer as HTMLElement[] | undefined;
			if (containerRef) {
				containerRef[containerRef.length - 1]?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				});
			}
		},
		closeDialog() {
			this.modalBus.emit('close');
			void this.externalHooks.run('workflowSettings.dialogVisibleChanged', {
				dialogVisible: false,
			});
		},
		openChatEmbedModal() {
			this.uiStore.openModal(CHAT_EMBED_MODAL_KEY);
		},
	},
});
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

		.chat-message {
			float: left;
			margin: var(--spacing-2xs) var(--spacing-s);
		}

		.message {
			float: left;
			position: relative;
			width: 100%;

			.content {
				border-radius: var(--border-radius-base);
				line-height: 1.5;
				margin: var(--spacing-2xs) var(--spacing-s);
				max-width: 75%;
				padding: 1em;
				white-space: pre-wrap;
				overflow-x: auto;

				&.bot {
					background-color: var(--color-lm-chat-bot-background);
					color: var(--color-lm-chat-bot-color);
					float: left;
					border-bottom-left-radius: 0;

					.message-options {
						left: 1.5em;
					}
				}

				&.user {
					background-color: var(--color-lm-chat-user-background);
					color: var(--color-lm-chat-user-color);
					float: right;
					text-align: right;
					border-bottom-right-radius: 0;

					.message-options {
						right: 1.5em;
						text-align: right;
					}
				}

				.message-options {
					color: #aaa;
					display: none;
					font-size: 0.9em;
					height: 26px;
					position: absolute;
					text-align: left;
					top: -1.2em;
					width: 120px;
					z-index: 10;

					.option {
						cursor: pointer;
						display: inline-block;
						width: 28px;
					}

					.link {
						text-decoration: underline;
					}
				}

				&:hover {
					.message-options {
						display: initial;
					}
				}
			}
		}
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
