<template>
	<div :class="$style.container">
		<div>
			<n8n-heading v-if="header" tag="h1" bold>
				{{ header }}
			</n8n-heading>
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
import { START_NODE_TYPE } from '@/constants';
import { INodeUi } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { workflowActivate } from '@/components/mixins/workflowActivate';

export default mixins(
	workflowActivate,
).extend({
	name: 'TriggerPanel',
	props: {
		nodeName: {
			type: String,
		},
	},
	computed: {
		node(): INodeUi {
			return this.$store.getters.getNodeByName(this.nodeName);
		},
		isWorkflowActive (): boolean {
			return this.$store.getters.isActive;
		},
		header(): string {
			return this.$locale.baseText('triggerPanel.executeWorkflow');
		},
		activationHint(): string {
			if (this.node.type === START_NODE_TYPE) {
				return this.$locale.baseText('triggerPanel.startNodeHint');
			}

			if (!this.isWorkflowActive) {
				return 'activate';
			}

			return '';
		},
	},
	methods: {
		onActivate() {
			this.$store.commit('setActiveNode', null);
			setTimeout(() => {
				this.activateCurrentWorkflow();
			}, 1000);
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

</style>
