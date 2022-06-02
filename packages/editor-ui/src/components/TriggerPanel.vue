<template>
	<div :class="$style.container">
		<span>
			<n8n-spinner v-if="isActivelyPolling" type="ring" />
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

			<NodeExecuteButton v-if="showExecuteButton" :nodeName="nodeName" @execute="onNodeExecute" size="medium" />
		</div>

		<n8n-text size="small" v-if="activationHint === 'activate'">
			<a @click="onActivate">{{ $locale.baseText('triggerPanel.activateWorkflow.activate') }}</a>
			{{ $locale.baseText('triggerPanel.activateWorkflow.message') }}
		</n8n-text>
		<n8n-text size="small" v-else-if="activationHint">
			{{ activationHint }}
		</n8n-text>
	</div>
</template>

<script lang="ts">
import { START_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeUi } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { workflowActivate } from '@/components/mixins/workflowActivate';
import { INodeTypeDescription } from 'n8n-workflow';
import { getTriggerNodeServiceName } from './helpers';
import NodeExecuteButton from './NodeExecuteButton.vue';

export default mixins(
	workflowActivate,
).extend({
	name: 'TriggerPanel',
	components: {
		NodeExecuteButton,
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
		isWebhookNode(): boolean {
			return Boolean(this.node && this.node.type === WEBHOOK_NODE_TYPE);
		},
		isWebhookBasedNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.webhooks && this.nodeType.webhooks.length);
		},
		isPollingNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.polling);
		},
		isActivelyPolling(): boolean {
			const triggeredNode = this.$store.getters.executedNode;

			return this.isPollingNode && this.nodeName === triggeredNode;
		},
		isWorkflowActive (): boolean {
			return this.$store.getters.isActive;
		},
		header(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType.displayName): '';

			if (this.isActivelyPolling) {
				return this.$locale.baseText('triggerPanel.pollingNode.fetchingEvent');
			}

			if (this.nodeType && this.isPollingNode) {
				return this.$locale.baseText('triggerPanel.scheduledNode.action', { interpolate: { name: serviceName } });
			}

			if (this.isWebhookNode) {
				return this.$locale.baseText('triggerPanel.webhookNode.action');
			}

			if (this.isWebhookBasedNode) {
				return this.$locale.baseText('triggerPanel.webhookBasedNode.action', { interpolate: { name: serviceName }});
			}

			return this.$locale.baseText('triggerPanel.executeWorkflow');
		},
		subheader(): string {
			const serviceName = this.nodeType ? getTriggerNodeServiceName(this.nodeType.displayName): '';
			if (this.isActivelyPolling) {
				return this.$locale.baseText('triggerPanel.pollingNode.fetchingHint', { interpolate: { name: serviceName }});
			}

			if (this.nodeType && this.isPollingNode) {
				return this.$locale.baseText('triggerPanel.scheduledNode.hint', { interpolate: { name: serviceName }});
			}

			return '';
		},
		activationHint(): string {
			if (this.node && this.node.type === START_NODE_TYPE) {
				return this.$locale.baseText('triggerPanel.startNodeHint');
			}

			if (!this.isWorkflowActive && !this.isActivelyPolling) {
				return 'activate';
			}

			return '';
		},
		showExecuteButton(): boolean {
			return (this.isPollingNode && !this.isActivelyPolling) || this.isWebhookNode || this.isWebhookBasedNode;
		},
	},
	methods: {
		onActivate() {
			this.$store.commit('setActiveNode', null);
			setTimeout(() => {
				this.activateCurrentWorkflow();
			}, 1000);
		},
		onNodeExecute () {
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


</style>
