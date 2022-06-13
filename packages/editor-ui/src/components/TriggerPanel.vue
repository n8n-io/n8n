<template>
	<div :class="$style.container">
		<div v-if="hasIssues"></div>
		<div v-else-if="isListeningForEvents">
			<div :class="$style.pulseContainer">
				<div :class="$style.pulse">
					<NodeIcon :nodeType="nodeType" :size="40"></NodeIcon>
				</div>
			</div>
			<div v-if="isWebhookNode">
				<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
					$locale.baseText('triggerPanel.webhookNode.listening')
				}}</n8n-text>
				<n8n-text tag="div" class="mb-xs">
					{{
						$locale.baseText('triggerPanel.webhookNode.requestHint', {
							interpolate: { type: this.webhookHttpMethod },
						})
					}}
				</n8n-text>
				<CopyInput :value="webhookTestUrl" class="mb-2xl"></CopyInput>
				<n8n-text tag="div" @click="onLinkClick">
					<span v-html="$locale.baseText('triggerPanel.webhookNode.prodRequestsHint')"></span>
				</n8n-text>
			</div>
			<div v-else>
				<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
					$locale.baseText('triggerPanel.webhookBasedNode.listening')
				}}</n8n-text>
				<n8n-text tag="div" class="mb-xs">
					{{
						$locale.baseText('triggerPanel.webhookBasedNode.serviceHint', {
							interpolate: { service: serviceName },
						})
					}}
				</n8n-text>
			</div>
		</div>
		<div v-else>
			<span v-if="isActivelyPolling">
				<n8n-spinner type="ring" />
			</span>

			<div :class="$style.action">
				<div :class="$style.header">
					<n8n-heading v-if="header" tag="h1" bold>
						{{ header }}
					</n8n-heading>
					<n8n-text v-if="subheader">
						<span v-html="subheader"></span>
					</n8n-text>
				</div>

				<NodeExecuteButton
					v-if="showExecuteButton"
					:nodeName="nodeName"
					@execute="onNodeExecute"
					size="medium"
				/>
			</div>

			<n8n-text size="small" @click="onLinkClick">
				<span v-html="activationHint"></span>
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import { EXECUTIONS_MODAL_KEY, WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeUi } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import { getTriggerNodeServiceName } from './helpers';
import NodeExecuteButton from './NodeExecuteButton.vue';
import { workflowHelpers } from './mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';
import CopyInput from './CopyInput.vue';
import NodeIcon from './NodeIcon.vue';
import { copyPaste } from './mixins/copyPaste';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(workflowHelpers, copyPaste, showMessage).extend({
	name: 'TriggerPanel',
	components: {
		NodeExecuteButton,
		CopyInput,
		NodeIcon,
	},
	props: {
		nodeName: {
			type: String,
		},
	},
	computed: {
		node(): INodeUi | null {
			return this.$store.getters.getNodeByName(this.nodeName);
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type, this.node.typeVersion);
			}

			return null;
		},
		hasIssues (): boolean {
			return Boolean(this.node && this.node.issues !== undefined && Object.keys(this.node.issues).length);
		},
		serviceName(): string {
			if (this.nodeType) {
				return getTriggerNodeServiceName(this.nodeType.displayName);
			}

			return '';
		},
		isWebhookNode(): boolean {
			return Boolean(this.node && this.node.type === WEBHOOK_NODE_TYPE);
		},
		webhookHttpMethod(): string | undefined {
			if (
				!this.node ||
				!this.nodeType ||
				!this.nodeType.webhooks ||
				!this.nodeType.webhooks.length
			) {
				return undefined;
			}

			return this.getWebhookExpressionValue(this.nodeType.webhooks[0], 'httpMethod');
		},
		webhookTestUrl(): string | undefined {
			if (
				!this.node ||
				!this.nodeType ||
				!this.nodeType.webhooks ||
				!this.nodeType.webhooks.length
			) {
				return undefined;
			}

			return this.getWebhookUrl(this.nodeType.webhooks[0], this.node, 'test');
		},
		webhookProdUrl(): string | undefined {
			if (
				!this.node ||
				!this.nodeType ||
				!this.nodeType.webhooks ||
				!this.nodeType.webhooks.length
			) {
				return undefined;
			}

			return this.getWebhookUrl(this.nodeType.webhooks[0], this.node, 'prod');
		},
		isWebhookBasedNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.webhooks && this.nodeType.webhooks.length);
		},
		isPollingNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.polling);
		},
		isListeningForEvents(): boolean {
			const waitingOnWebhook = this.$store.getters.executionWaitingForWebhook as boolean;
			const executedNode = this.$store.getters.executedNode as string | undefined;
			return (
				this.isWebhookBasedNode &&
				waitingOnWebhook &&
				(!executedNode || executedNode === this.nodeName)
			);
		},
		isActivelyPolling(): boolean {
			const triggeredNode = this.$store.getters.executedNode;

			return this.isPollingNode && this.nodeName === triggeredNode;
		},
		isWorkflowActive(): boolean {
			return this.$store.getters.isActive;
		},
		header(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType.displayName) : '';

			if (this.isActivelyPolling) {
				return this.$locale.baseText('triggerPanel.pollingNode.fetchingEvent');
			}

			if (this.nodeType && this.isPollingNode) {
				return this.$locale.baseText('triggerPanel.scheduledNode.action', {
					interpolate: { name: serviceName },
				});
			}

			if (this.isWebhookNode) {
				return this.$locale.baseText('triggerPanel.webhookNode.action');
			}

			if (this.isWebhookBasedNode) {
				return this.$locale.baseText('triggerPanel.webhookBasedNode.action', {
					interpolate: { name: serviceName },
				});
			}

			return this.$locale.baseText('triggerPanel.executeWorkflow');
		},
		subheader(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType.displayName) : '';
			if (this.isActivelyPolling) {
				return this.$locale.baseText('triggerPanel.pollingNode.fetchingHint', {
					interpolate: { name: serviceName },
				});
			}

			if (this.nodeType && this.isPollingNode) {
				return this.$locale.baseText('triggerPanel.scheduledNode.hint', {
					interpolate: { name: serviceName },
				});
			}

			return '';
		},
		activationHint(): string {
			if (!this.isWorkflowActive && !this.isActivelyPolling) {
				if (this.isWebhookNode) {
					return this.$locale.baseText('triggerPanel.webhookNode.inactiveHint');
				}

				if (this.isWebhookBasedNode) {
					return this.$locale.baseText('triggerPanel.webhookBasedNode.inactiveHint', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			if (this.isWorkflowActive) {
				if (this.isWebhookNode) {
					return this.$locale.baseText('triggerPanel.webhookNode.activeHint');
				}

				if (this.isWebhookBasedNode) {
					return this.$locale.baseText('triggerPanel.webhookBasedNode.activeHint', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			return '';
		},
		showExecuteButton(): boolean {
			return (
				(this.isPollingNode && !this.isActivelyPolling) ||
				this.isWebhookNode ||
				this.isWebhookBasedNode
			);
		},
	},
	methods: {
		onLinkClick(e: MouseEvent) {
			if (!e.target) {
				return;
			}
			const target = e.target as HTMLElement;
			if (target.localName !== 'a') return;

			if (target.dataset && target.dataset.key) {
				e.stopPropagation();
				e.preventDefault();

				if (target.dataset.key === 'activate') {
					this.$emit('activate');
				} else if (target.dataset.key === 'copy') {
					if (this.webhookProdUrl) {
						this.copyToClipboard(this.webhookProdUrl);
						this.$showMessage({
							title: this.$locale.baseText('generic.copiedToClipboard'),
							type: 'success',
						});
					}
				} else if (target.dataset.key === 'executions') {
					this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
				}
			}
		},
		onAction(action: string) {
			if (action === 'activate') {
				this.$emit('activate');
			}
		},
		onNodeExecute() {
			this.$emit('execute');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-base);
	display: flex;
	flex-direction: column;

	align-items: center;
	justify-content: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
	text-align: center;
	overflow: hidden;

	> * {
		max-width: 316px;
		margin-bottom: var(--spacing-2xl);
	}
}

.header {
	margin-bottom: var(--spacing-s);

	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.action {
	margin-bottom: var(--spacing-2xl);
}

.pulseContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 240px;
	width: 100%;
}

$--light-pulse-color: hsla(
	var(--color-primary-h),
	var(--color-primary-s),
	var(--color-primary-l),
	0.4
);

$--dark-pulse-color: hsla(
	var(--color-primary-h),
	var(--color-primary-s),
	var(--color-primary-l),
	0
);

.pulse {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 74px;
	height: 74px;
	border-radius: 50%;
	box-shadow: 0 0 0 $--light-pulse-color;
	animation: pulse 4.5s infinite;
}

@keyframes pulse {
	0% {
		-moz-box-shadow: 0 0 0 0 $--light-pulse-color;
		box-shadow: 0 0 0 0 $--light-pulse-color;
	}

	20% {
		-moz-box-shadow: 0 0 0 60px $--dark-pulse-color;
		box-shadow: 0 0 0 60px $--dark-pulse-color;
	}

	21% {
		-moz-box-shadow: 0 0 0 0 transparent;
		box-shadow: 0 0 0 0 transparent;
	}

	23% {
		-moz-box-shadow: 0 0 0 0 $--light-pulse-color;
		box-shadow: 0 0 0 0 $--light-pulse-color;
	}


	44% {
		-moz-box-shadow: 0 0 0 60px $--dark-pulse-color;
		box-shadow: 0 0 0 60px $--dark-pulse-color;
	}

	45% {
		-moz-box-shadow: 0 0 0 0 $--dark-pulse-color;
		box-shadow: 0 0 0 0 $--dark-pulse-color;
	}
}
</style>
