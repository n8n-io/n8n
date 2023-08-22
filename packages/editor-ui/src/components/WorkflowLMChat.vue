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
					@click.stop="sendChatMessage"
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
	sender: 'ai' | 'human';
	// TODO: Link them with an execution ID. So we can later
	//       allow people to debug easier
	executionId?: string;
}

// TODO:
// - add buttons to resend same message, load past message
// - allow to jump to execution
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
		updated(event: KeyboardEvent) {
			if (event.ctrlKey && event.key === 'Enter') {
				this.sendChatMessage();
			}
		},
		async sendChatMessage() {
			const message = this.currentMessage;
			this.messages.push({
				text: message,
				sender: 'human',
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

			await this.runWorkflow({ triggerNode: triggerNode[0].name, nodeData, source: 'RunData.ManualChatMessage' });

			this.waitForExecution();
		},
		waitForExecution() {
			const that = this;
			const waitInterval = setInterval(() => {
				if (!that.isLoading) {
					clearInterval(waitInterval)

					const lastNodeExecuted = this.workflowsStore.getWorkflowExecution?.data?.resultData.lastNodeExecuted;
					let responseMessage = get(this.workflowsStore.getWorkflowExecution?.data?.resultData.runData, `[${lastNodeExecuted}][0].data.main[0][0].json.output`) as string | undefined;

					if (!responseMessage) {
						responseMessage = '<NO RESPONSE FOUND>';
					}

					this.messages.push({
						text: responseMessage,
						sender: 'ai',
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
	font-size: var(--font-size-s);
	color: $custom-font-black;

	.messages {
		border: 1px solid #E0E0E0;
		border-radius: 4px;
		height: 400px;
		overflow: auto;

		.message {
			position: relative;
			float: left;
			width: 100%;

			.content {
				margin: 0.5em 1em;
				padding: 1em;
				border-radius: 10px;
				max-width: 75%;

				&.ai {
					background-color: #E0D0D0;
					float: left;
				}
				&.human {
					background-color: #D0E0D0;
					float: right;
					text-align: right;
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
