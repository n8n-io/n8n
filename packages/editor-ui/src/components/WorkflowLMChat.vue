<template>
	<Modal
		:name="WORKFLOW_LM_CHAT_MODAL_KEY"
		width="65%"
		maxHeight="80%"
		title="Chat Window"
		:eventBus="modalBus"
		:scrollable="false"
	>
		<template #content>
			<div v-loading="isLoading" class="workflow-lm-chat" data-test-id="workflow-lm-chat-dialog">
				<div class="messages" ref="messagesContainer">
					<div :class="['message', message.sender]" v-for="message in messages">
						<div :class="['content', message.sender]">
							{{ message.text }}

							<div class="message-options no-select-on-click">
								<n8n-info-tip type="tooltip" theme="info-light" tooltipPlacement="right" v-if="message.sender === 'bot'">
									<div v-if="message.executionId">
										<n8n-text :bold="true" size="small">
											<span @click.stop="displayExecution(message.executionId)">
												Execution ID: <a href="#" class="link">{{ message.executionId }}</a>
											</span>
										</n8n-text>

									</div>
								</n8n-info-tip>

								<div
									@click="repostMessage(message)"
									class="option"
									title="Repost Message"
									data-test-id="repost-message-button"
									v-if="message.sender === 'user'"
								>
									<font-awesome-icon icon="redo" />
								</div>
								<div
									@click="reuseMessage(message)"
									class="option"
									title="Reuse Message"
									data-test-id="reuse-message-button"
									v-if="message.sender === 'user'"
								>
									<font-awesome-icon icon="copy" />
								</div>

							</div>
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
					placeholder="Type in message"
					@keydown="updated"
				/>
				<n8n-button
					@click.stop="sendChatMessage(currentMessage)"
					class="send-button"
					:loading="isLoading"
					label="Chat"
					size="large"
					icon="play-circle"
					type="primary"
					data-test-id="workflow-chat-button"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import { useToast } from '@/composables';
import Modal from '@/components/Modal.vue';
import {
	NODE_TRIGGER_CHAT_BUTTON,
	VIEWS,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';

import { workflowRun } from '@/mixins/workflowRun';
import { get } from 'lodash-es';

import {
	useWorkflowsStore,
} from '@/stores';
import { createEventBus } from 'n8n-design-system/utils';
import { INodeType, ITaskData } from 'n8n-workflow';

interface ChatMessage {
	text: string;
	sender: 'bot' | 'user';
	executionId?: string;
}

// TODO:
// - display additional information like execution time, tokens used, ...
// - display errors better
// - persist messages in memory & load them again (load from model memory?)

export default defineComponent({
	name: 'WorkflowLMChat',
	mixins: [workflowRun],
	components: {
		Modal,
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
			currentMessage: '',
			messages: [] as ChatMessage[],
			modalBus: createEventBus(),
			WORKFLOW_LM_CHAT_MODAL_KEY,
		};
	},

	computed: {
		...mapStores(
			useWorkflowsStore,
		),
		isLoading(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
	},
	async mounted() {
		this.messages = this.getChatMessages();
	},
	methods: {
		displayExecution(executionId: string) {
			const workflow = this.getCurrentWorkflow();
			const route = this.$router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: workflow.id, executionId: executionId },
			});
			window.open(route.href, '_blank');
		},
		repostMessage(message: ChatMessage) {
			this.sendChatMessage(message.text);
		},
		reuseMessage(message: ChatMessage) {
			this.currentMessage = message.text;
			const inputField = this.$refs.inputField as HTMLInputElement;
			inputField.focus();
		},
		updated(event: KeyboardEvent) {
			if (event.ctrlKey && event.key === 'Enter') {
				this.sendChatMessage(this.currentMessage);
			}
		},
		async sendChatMessage(message: string) {
			this.messages.push({
				text: message,
				sender: 'user',
			} as ChatMessage);

			this.currentMessage = '';

			this.startWorkflowWithMessage(message);

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
		getChatMessages(): ChatMessage[] {
			return [];
		},
		async startWorkflowWithMessage(message: string) {
			const workflow = this.getCurrentWorkflow();
			const triggerNode = workflow.queryNodes((nodeType: INodeType) => nodeType.description.name === NODE_TRIGGER_CHAT_BUTTON);

			if (!triggerNode.length) {
				this.showError(new Error('Chat Trigger Node could not be found!'), 'Trigger Node not found')
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

			const response = await this.runWorkflow({ triggerNode: triggerNode[0].name, nodeData, source: 'RunData.ManualChatMessage' });

			if (!response) {
				this.showError(new Error('It was not possible to start workflow!'), 'Workflow could not be started')
				return;
			}

			this.waitForExecution(response.executionId);
		},
		waitForExecution(executionId?: string) {
			const that = this;
			const waitInterval = setInterval(() => {
				if (!that.isLoading) {
					clearInterval(waitInterval)

					const lastNodeExecuted = this.workflowsStore.getWorkflowExecution?.data?.resultData.lastNodeExecuted;
					// TODO: Gross hack to get the response message
					let responseMessage = (get(this.workflowsStore.getWorkflowExecution?.data?.resultData.runData, `[${lastNodeExecuted}][0].data.main[0][0].json.output`) ?? get(this.workflowsStore.getWorkflowExecution?.data?.resultData.runData, `[${lastNodeExecuted}][0].data.main[0][0].json.response`)) as string | undefined;

					if (!responseMessage) {
						responseMessage = '<NO RESPONSE FOUND>';
					}

					this.messages.push({
						text: responseMessage,
						sender: 'bot',
						executionId,
					} as ChatMessage);

				}
			}, 500);
		},
		closeDialog() {
			this.modalBus.emit('close');
			void this.$externalHooks().run('workflowSettings.dialogVisibleChanged', {
				dialogVisible: false,
			});
		},
	},
});
</script>

<style scoped lang="scss">
.workflow-lm-chat {
	color: $custom-font-black;
	font-size: var(--font-size-s);

	.messages {
		border: 1px solid #E0E0E0;
		border-radius: 4px;
		height: 400px;
		overflow: hidden auto;
		padding-top: 1.5em;

		.message {
			float: left;
			position: relative;
			width: 100%;

			.content {
				border-radius: 10px;
				margin: 0.5em 1em;
				max-width: 75%;
				padding: 1em;
				white-space: pre-wrap;

				&.bot {
					background-color: #E0D0D0;
					float: left;

					.message-options {
						left: 1.5em;
					}
				}

				&.user {
					background-color: #D0E0D0;
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
