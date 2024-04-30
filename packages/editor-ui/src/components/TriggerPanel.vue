<template>
	<div :class="$style.container">
		<transition name="fade" mode="out-in">
			<div v-if="hasIssues || hideContent" key="empty"></div>
			<div v-else-if="isListeningForEvents" key="listening">
				<n8n-pulse>
					<NodeIcon :node-type="nodeType" :size="40"></NodeIcon>
				</n8n-pulse>
				<div v-if="isWebhookNode">
					<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
						$locale.baseText('ndv.trigger.webhookNode.listening')
					}}</n8n-text>
					<div :class="[$style.shake, 'mb-xs']">
						<n8n-text>
							{{
								$locale.baseText('ndv.trigger.webhookNode.requestHint', {
									interpolate: { type: webhookHttpMethod },
								})
							}}
						</n8n-text>
					</div>
					<CopyInput
						:value="webhookTestUrl"
						:toast-title="$locale.baseText('ndv.trigger.copiedTestUrl')"
						class="mb-2xl"
						size="medium"
						:collapse="true"
						:copy-button-text="$locale.baseText('generic.clickToCopy')"
						@copy="onTestLinkCopied"
					></CopyInput>
					<NodeExecuteButton
						data-test-id="trigger-execute-button"
						:node-name="nodeName"
						size="medium"
						telemetry-source="inputs"
						@execute="onNodeExecute"
					/>
				</div>
				<div v-else>
					<n8n-text tag="div" size="large" color="text-dark" class="mb-2xs" bold>{{
						listeningTitle
					}}</n8n-text>
					<div :class="[$style.shake, 'mb-xs']">
						<n8n-text tag="div">
							{{ listeningHint }}
						</n8n-text>
					</div>
					<div v-if="displayChatButton">
						<n8n-button class="mb-xl" @click="openWebhookUrl()">
							{{ $locale.baseText('ndv.trigger.chatTrigger.openChat') }}
						</n8n-button>
					</div>

					<NodeExecuteButton
						data-test-id="trigger-execute-button"
						:node-name="nodeName"
						size="medium"
						telemetry-source="inputs"
						@execute="onNodeExecute"
					/>
				</div>
			</div>
			<div v-else key="default">
				<div v-if="isActivelyPolling" class="mb-xl">
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
						data-test-id="trigger-execute-button"
						:node-name="nodeName"
						size="medium"
						telemetry-source="inputs"
						@execute="onNodeExecute"
					/>
				</div>

				<n8n-text v-if="activationHint" size="small" @click="onLinkClick">
					<span v-html="activationHint"></span>&nbsp;
				</n8n-text>
				<n8n-link
					v-if="activationHint && executionsHelp"
					size="small"
					@click="expandExecutionHelp"
					>{{ $locale.baseText('ndv.trigger.moreInfo') }}</n8n-link
				>
				<n8n-info-accordion
					v-if="executionsHelp"
					ref="help"
					:class="$style.accordion"
					:title="$locale.baseText('ndv.trigger.executionsHint.question')"
					:description="executionsHelp"
					:event-bus="executionsHelpEventBus"
					@click:body="onLinkClick"
				></n8n-info-accordion>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import {
	CHAT_TRIGGER_NODE_TYPE,
	VIEWS,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_SETTINGS_MODAL_KEY,
	FORM_TRIGGER_NODE_TYPE,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import CopyInput from '@/components/CopyInput.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

export default defineComponent({
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
		pushRef: {
			type: String,
		},
	},
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });

		return {
			workflowHelpers,
		};
	},
	data: () => {
		return {
			executionsHelpEventBus: createEventBus(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore),
		node(): INodeUi | null {
			return this.workflowsStore.getNodeByName(this.nodeName as string);
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}

			return null;
		},
		hideContent(): boolean {
			if (!this.nodeType?.triggerPanel) {
				return false;
			}

			if (
				this.nodeType?.triggerPanel &&
				this.nodeType?.triggerPanel.hasOwnProperty('hideContent')
			) {
				const hideContent = this.nodeType?.triggerPanel.hideContent;
				if (typeof hideContent === 'boolean') {
					return hideContent;
				}

				if (this.node) {
					const hideContentValue = this.workflowHelpers
						.getCurrentWorkflow()
						.expression.getSimpleParameterValue(this.node, hideContent, 'internal', {});

					if (typeof hideContentValue === 'boolean') {
						return hideContentValue;
					}
				}
			}

			return false;
		},
		hasIssues(): boolean {
			return Boolean(
				this.node?.issues && (this.node.issues.parameters || this.node.issues.credentials),
			);
		},
		serviceName(): string {
			if (this.nodeType) {
				return getTriggerNodeServiceName(this.nodeType);
			}

			return '';
		},
		displayChatButton(): boolean {
			return Boolean(
				this.node &&
					this.node.type === CHAT_TRIGGER_NODE_TYPE &&
					this.node.parameters.mode !== 'webhook',
			);
		},
		isWebhookNode(): boolean {
			return Boolean(this.node && this.node.type === WEBHOOK_NODE_TYPE);
		},
		webhookHttpMethod(): string | undefined {
			if (!this.node || !this.nodeType?.webhooks?.length) {
				return undefined;
			}

			const httpMethod = this.workflowHelpers.getWebhookExpressionValue(
				this.nodeType.webhooks[0],
				'httpMethod',
				false,
			);

			if (Array.isArray(httpMethod)) {
				return httpMethod.join(', ');
			}

			return httpMethod;
		},
		webhookTestUrl(): string | undefined {
			if (!this.node || !this.nodeType?.webhooks?.length) {
				return undefined;
			}

			return this.workflowHelpers.getWebhookUrl(this.nodeType.webhooks[0], this.node, 'test');
		},
		isWebhookBasedNode(): boolean {
			return Boolean(this.nodeType?.webhooks?.length);
		},
		isPollingNode(): boolean {
			return Boolean(this.nodeType?.polling);
		},
		isListeningForEvents(): boolean {
			const waitingOnWebhook = this.workflowsStore.executionWaitingForWebhook;
			const executedNode = this.workflowsStore.executedNode;
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
		listeningTitle(): string {
			return this.nodeType?.name === FORM_TRIGGER_NODE_TYPE
				? this.$locale.baseText('ndv.trigger.webhookNode.formTrigger.listening')
				: this.$locale.baseText('ndv.trigger.webhookNode.listening');
		},
		listeningHint(): string {
			switch (this.nodeType?.name) {
				case CHAT_TRIGGER_NODE_TYPE:
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.chatTrigger.serviceHint');
				case FORM_TRIGGER_NODE_TYPE:
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.formTrigger.serviceHint');
				default:
					return this.$locale.baseText('ndv.trigger.webhookBasedNode.serviceHint', {
						interpolate: { service: this.serviceName },
					});
			}
		},
		header(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType) : '';

			if (this.isActivelyPolling) {
				return this.$locale.baseText('ndv.trigger.pollingNode.fetchingEvent');
			}

			if (this.nodeType?.triggerPanel && typeof this.nodeType.triggerPanel.header === 'string') {
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
			if (this.nodeType?.triggerPanel?.executionsHelp !== undefined) {
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

			if (this.nodeType?.triggerPanel?.activationHint) {
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
				} else {
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
				} else {
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
				this.executionsHelpEventBus.emit('expand');
			}
		},
		openWebhookUrl() {
			this.$telemetry.track('User clicked ndv link', {
				workflow_id: this.workflowsStore.workflowId,
				push_ref: this.pushRef,
				pane: 'input',
				type: 'open-chat',
			});
			window.open(this.webhookTestUrl, '_blank', 'noreferrer');
		},
		onLinkClick(e: MouseEvent) {
			if (!e.target) {
				return;
			}
			const target = e.target as HTMLElement;
			if (target.localName !== 'a') return;

			if (target.dataset?.key) {
				e.stopPropagation();
				e.preventDefault();

				if (target.dataset.key === 'activate') {
					this.$emit('activate');
				} else if (target.dataset.key === 'executions') {
					this.$telemetry.track('User clicked ndv link', {
						workflow_id: this.workflowsStore.workflowId,
						push_ref: this.pushRef,
						pane: 'input',
						type: 'open-executions-log',
					});
					this.ndvStore.activeNodeName = null;
					void this.$router.push({
						name: VIEWS.EXECUTIONS,
					});
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
