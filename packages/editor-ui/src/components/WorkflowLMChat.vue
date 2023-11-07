<template>
	<Modal
		:name="WORKFLOW_LM_CHAT_MODAL_KEY"
		width="80%"
		maxHeight="80%"
		:title="
			$locale.baseText('chat.window.title', {
				interpolate: {
					nodeName: connectedNode?.name || $locale.baseText('chat.window.noChatNode'),
				},
			})
		"
		:eventBus="modalBus"
		:scrollable="false"
		@keydown.stop
	>
		<template #content>
			<div v-loading="isLoading" class="workflow-lm-chat" data-test-id="workflow-lm-chat-dialog">
				<div class="messages ignore-key-press" ref="messagesContainer">
					<div
						v-for="message in messages"
						:key="`${message.executionId}__${message.sender}`"
						:class="['message', message.sender]"
					>
						<div :class="['content', message.sender]">
							{{ message.text }}

							<div class="message-options no-select-on-click">
								<n8n-info-tip
									type="tooltip"
									theme="info-light"
									tooltipPlacement="right"
									v-if="message.sender === 'bot'"
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
									@click="repostMessage(message)"
									class="option"
									:title="$locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
									data-test-id="repost-message-button"
									v-if="message.sender === 'user'"
								>
									<font-awesome-icon icon="redo" />
								</div>
								<div
									@click="reuseMessage(message)"
									class="option"
									:title="$locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage')"
									data-test-id="reuse-message-button"
									v-if="message.sender === 'user'"
								>
									<font-awesome-icon icon="copy" />
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="logs-wrapper">
					<n8n-text class="logs-title" tag="p" size="large">{{
						$locale.baseText('chat.window.logs')
					}}</n8n-text>
					<div class="logs">
						<run-data-ai v-if="node" :node="node" hide-title slim :key="messages.length" />
						<div v-else class="no-node-connected">
							<n8n-text tag="div" :bold="true" color="text-dark" size="large">{{
								$locale.baseText('chat.window.noExecution')
							}}</n8n-text>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div class="workflow-lm-chat-footer">
				<n8n-input
					v-model="currentMessage"
					class="message-input"
					type="textarea"
					ref="inputField"
					:placeholder="$locale.baseText('chat.window.chat.placeholder')"
					@keydown.stop="updated"
				/>
				<n8n-button
					@click.stop="sendChatMessage(currentMessage)"
					class="send-button"
					:loading="isLoading"
					:label="$locale.baseText('chat.window.chat.sendButtonText')"
					size="large"
					icon="comment"
					type="primary"
					data-test-id="workflow-chat-button"
				/>

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

import { useToast } from '@/composables';
import Modal from '@/components/Modal.vue';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_CODE_NODE_TYPE,
	AI_SUBCATEGORY,
	CHAT_EMBED_MODAL_KEY,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	VIEWS,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';

import { workflowRun } from '@/mixins/workflowRun';
import { get, last } from 'lodash-es';

import { useUIStore, useWorkflowsStore } from '@/stores';
import { createEventBus } from 'n8n-design-system/utils';
import type { IDataObject, INodeType, INode, ITaskData } from 'n8n-workflow';
import { NodeHelpers, NodeConnectionType } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

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
	mixins: [workflowRun],
	components: {
		Modal,
		RunDataAi,
	},
	setup(props) {
		return {
			...useToast(),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...workflowRun.setup?.(props),
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
			this.messages.push({
				text: message,
				sender: 'user',
			} as ChatMessage);

			this.currentMessage = '';

			await this.startWorkflowWithMessage(message);

			// Scroll to bottom
			const containerRef = this.$refs.messagesContainer as HTMLElement | undefined;
			if (containerRef) {
				// Wait till message got added else it will not scroll correctly
				await this.$nextTick();
				containerRef.scrollTo({
					top: containerRef.scrollHeight,
					behavior: 'smooth',
				});
			}
		},

		setConnectedNode() {
			const workflow = this.getCurrentWorkflow();
			const triggerNode = workflow.queryNodes(
				(nodeType: INodeType) => nodeType.description.name === MANUAL_CHAT_TRIGGER_NODE_TYPE,
			);

			if (!triggerNode.length) {
				this.showError(
					new Error('Chat Trigger Node could not be found!'),
					'Trigger Node not found',
				);
				return;
			}
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
					(parentNodeName) => parentNodeName === triggerNode[0].name,
				);

				return Boolean(isChatChild && (isAgent || isChain || isCustomChainOrAgent));
			});

			if (!chatNode) {
				this.showError(
					new Error('Chat viable node(Agent or Chain) could not be found!'),
					'Chat node not found',
				);
				return;
			}

			this.connectedNode = chatNode;
		},
		getChatMessages(): ChatMessage[] {
			if (!this.connectedNode) return [];

			const workflow = this.getCurrentWorkflow();
			const connectedMemoryInputs =
				workflow.connectionsByDestinationNode[this.connectedNode.name]?.memory;
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
							chat_history?: unknown[];
						};
					} => get(data, 'data.memory.0.0.json')!,
				)
				?.find((data) =>
					['chatHistory', 'loadMemoryVariables'].includes(data?.action) ? data : undefined,
				);

			let chatHistory: LangChainMessage[];
			if (memoryOutputData?.chatHistory) {
				chatHistory = memoryOutputData?.chatHistory as LangChainMessage[];
			} else if (memoryOutputData?.response) {
				chatHistory = memoryOutputData?.response.chat_history as LangChainMessage[];
			} else {
				return [];
			}

			return chatHistory.map((message) => {
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
			const triggerNode = workflow.queryNodes(
				(nodeType: INodeType) => nodeType.description.name === MANUAL_CHAT_TRIGGER_NODE_TYPE,
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

			const nodeData: ITaskData = {
				startTime: new Date().getTime(),
				executionTime: 0,
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									input: message,
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
					});
				}
			}, 500);
		},
		closeDialog() {
			this.modalBus.emit('close');
			void this.$externalHooks().run('workflowSettings.dialogVisibleChanged', {
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

	.logs-wrapper {
		border: 1px solid #e0e0e0;
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
		background-color: var(--color-background-base);
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		height: 100%;
		width: 100%;
		overflow: hidden auto;
		padding-top: 1.5em;
		margin-right: 1em;

		.message {
			float: left;
			position: relative;
			width: 100%;

			.content {
				border-radius: 10px;
				line-height: 1.5;
				margin: 0.5em 1em;
				max-width: 75%;
				padding: 1em;
				white-space: pre-wrap;
				overflow-x: auto;

				&.bot {
					background-color: #e0d0d0;
					float: left;

					.message-options {
						left: 1.5em;
					}
				}

				&.user {
					background-color: #d0e0d0;
					float: right;
					text-align: right;

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
