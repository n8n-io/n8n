<template>
	<div :class="$style.container">
		<transition name="fade" mode="out-in">
			<div key="empty" v-if="hasIssues"></div>
			<div key="listening" v-else-if="isListeningForEvents">
				<n8n-pulse>
					<NodeIcon :nodeType="nodeType" :size="40"></NodeIcon>
				</n8n-pulse>
				<div v-if="isWebhookNode">
					<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
						$locale.baseText('ndv.trigger.webhookNode.listening')
					}}</n8n-text>
					<div :class="[$style.shake, 'mb-xs']">
						<n8n-text>
							{{
								$locale.baseText('ndv.trigger.webhookNode.requestHint', {
									interpolate: { type: this.webhookHttpMethod },
								})
							}}
						</n8n-text>
					</div>
					<CopyInput
						:value="webhookTestUrl"
						:toastTitle="$locale.baseText('ndv.trigger.copiedTestUrl')"
						class="mb-2xl"
						size="medium"
						:collapse="true"
						:copy-button-text="$locale.baseText('generic.clickToCopy')"
						@copy="onTestLinkCopied"
					></CopyInput>
					<NodeExecuteButton
						:nodeName="nodeName"
						@execute="onNodeExecute"
						size="medium"
						telemetrySource="inputs"
					/>
				</div>
				<div v-else>
					<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
						$locale.baseText('ndv.trigger.webhookBasedNode.listening')
					}}</n8n-text>
					<div :class="[$style.shake, 'mb-xs']">
						<n8n-text tag="div">
							{{
								$locale.baseText('ndv.trigger.webhookBasedNode.serviceHint', {
									interpolate: { service: serviceName },
								})
							}}
						</n8n-text>
					</div>
				</div>
			</div>
			<div key="default" v-else>
				<div class="mb-xl" v-if="isActivelyPolling">
					<n8n-spinner type="ring" />
				</div>

				<div :class="$style.action">
					<div :class="$style.header">
						<n8n-heading v-if="header" tag="h1" bold>
							{{ header }}
						</n8n-heading>
						<n8n-text v-if="subheader">
							<span v-text="subheader" />
						</n8n-text>
					</div>

					<NodeExecuteButton
						:nodeName="nodeName"
						@execute="onNodeExecute"
						size="medium"
						telemetrySource="inputs"
					/>
				</div>

				<n8n-text size="small" @click="onLinkClick" v-if="activationHint">
					<span v-html="activationHint"></span>&nbsp;
				</n8n-text>
				<n8n-link
					size="small"
					v-if="activationHint && executionsHelp"
					@click="expandExecutionHelp"
					>{{ $locale.baseText('ndv.trigger.moreInfo') }}</n8n-link
				>
				<n8n-info-accordion
					ref="help"
					v-if="executionsHelp"
					:class="$style.accordion"
					:title="$locale.baseText('ndv.trigger.executionsHint.question')"
					:description="executionsHelp"
					@click="onLinkClick"
				></n8n-info-accordion>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { EXECUTIONS_MODAL_KEY, WEBHOOK_NODE_TYPE, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
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
import Vue from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';

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
		sessionId: {
			type: String,
		},
	},
	computed: {
		...mapStores(
			useNodeTypesStore,
			useNDVStore,
			useUIStore,
			useWorkflowsStore,
		),
		node(): INodeUi | null {
			return this.workflowsStore.getNodeByName(this.nodeName);
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}

			return null;
		},
		hasIssues(): boolean {
			return Boolean(
				this.node &&
					this.node.issues &&
					(this.node.issues.parameters || this.node.issues.credentials),
			);
		},
		serviceName(): string {
			if (this.nodeType) {
				return getTriggerNodeServiceName(this.nodeType);
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
			const waitingOnWebhook = this.workflowsStore.executionWaitingForWebhook as boolean;
			const executedNode = this.workflowsStore.executedNode as string | undefined;
			return (
				!!this.node &&
				!this.node.disabled &&
				this.isWebhookBasedNode &&
				waitingOnWebhook &&
				(!executedNode || executedNode === this.nodeName)
			);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		isActivelyPolling(): boolean {
			const triggeredNode = this.workflowsStore.executedNode;

			return this.workflowRunning && this.isPollingNode && this.nodeName === triggeredNode;
		},
		isWorkflowActive(): boolean {
			return this.workflowsStore.isWorkflowActive;
		},
		header(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType) : '';

			if (this.isActivelyPolling) {
				return this.$locale.baseText('ndv.trigger.pollingNode.fetchingEvent');
			}

			if (
				this.nodeType &&
				this.nodeType.triggerPanel &&
				typeof this.nodeType.triggerPanel.header === 'string'
			) {
				return this.nodeType.triggerPanel.header;
			}

			if (this.isWebhookBasedNode) {
				return this.$locale.baseText('ndv.trigger.webhookBasedNode.action', {
					interpolate: { name: serviceName },
				});
			}

			return '';
		},
		subheader(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType) : '';
			if (this.isActivelyPolling) {
				return this.$locale.baseText('ndv.trigger.pollingNode.fetchingHint', {
					interpolate: { name: serviceName },
				});
			}

			return '';
		},
		executionsHelp(): string {
			if (
				this.nodeType &&
				this.nodeType.triggerPanel &&
				this.nodeType.triggerPanel.executionsHelp !== undefined
			) {
				if (typeof this.nodeType.triggerPanel.executionsHelp === 'string') {
					return this.nodeType.triggerPanel.executionsHelp;
				}
				if (!this.isWorkflowActive && this.nodeType.triggerPanel.executionsHelp.inactive) {
					return this.nodeType.triggerPanel.executionsHelp.inactive;
				}
				if (this.isWorkflowActive && this.nodeType.triggerPanel.executionsHelp.active) {
					return this.nodeType.triggerPanel.executionsHelp.active;
				}
			}

			if (this.isWebhookBasedNode) {
				if (this.isWorkflowActive) {
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.executionsHelp.active', {
						interpolate: { service: this.serviceName },
					});
				} else {
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.executionsHelp.inactive', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			if (this.isPollingNode) {
				if (this.isWorkflowActive) {
					return this.$locale.baseText('ndv.trigger.pollingNode.executionsHelp.active', {
						interpolate: { service: this.serviceName },
					});
				} else {
					return this.$locale.baseText('ndv.trigger.pollingNode.executionsHelp.inactive', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			return '';
		},
		activationHint(): string {
			if (this.isActivelyPolling) {
				return '';
			}

			if (
				this.nodeType &&
				this.nodeType.triggerPanel &&
				this.nodeType.triggerPanel.activationHint
			) {
				if (typeof this.nodeType.triggerPanel.activationHint === 'string') {
					return this.nodeType.triggerPanel.activationHint;
				}
				if (
					!this.isWorkflowActive &&
					typeof this.nodeType.triggerPanel.activationHint.inactive === 'string'
				) {
					return this.nodeType.triggerPanel.activationHint.inactive;
				}
				if (
					this.isWorkflowActive &&
					typeof this.nodeType.triggerPanel.activationHint.active === 'string'
				) {
					return this.nodeType.triggerPanel.activationHint.active;
				}
			}

			if (this.isWebhookBasedNode) {
				if (this.isWorkflowActive) {
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.activationHint.active', {
						interpolate: { service: this.serviceName },
					});
				}
				else {
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.activationHint.inactive', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			if (this.isPollingNode) {
				if (this.isWorkflowActive) {
					return this.$locale.baseText('ndv.trigger.pollingNode.activationHint.active', {
						interpolate: { service: this.serviceName },
					});
				}
				else {
					return this.$locale.baseText('ndv.trigger.pollingNode.activationHint.inactive', {
						interpolate: { service: this.serviceName },
					});
				}
			}

			return '';
		},
	},
	methods: {
		expandExecutionHelp() {
			if (this.$refs.help) {
				(this.$refs.help as Vue).$emit('expand');
			}
		},
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
				} else if (target.dataset.key === 'executions') {
					this.$telemetry.track('User clicked ndv link', {
						workflow_id: this.workflowsStore.workflowId,
						session_id: this.sessionId,
						pane: 'input',
						type: 'open-executions-log',
					});
					this.ndvStore.activeNodeName = null;
					this.uiStore.openModal(EXECUTIONS_MODAL_KEY);
				} else if (target.dataset.key === 'settings') {
					this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
				}
			}
		},
		onTestLinkCopied() {
			this.$telemetry.track('User copied webhook URL', {
				pane: 'inputs',
				type: 'test url',
			});
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
		width: 100%;
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

.shake {
	animation: shake 8s infinite;
}

@keyframes shake {
	90% {
		transform: translateX(0);
	}
	92.5% {
		transform: translateX(6px);
	}
	95% {
		transform: translateX(-6px);
	}
	97.5% {
		transform: translateX(6px);
	}
	100% {
		transform: translateX(0);
	}
}

.accordion {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
}
</style>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 200ms;
}
.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
