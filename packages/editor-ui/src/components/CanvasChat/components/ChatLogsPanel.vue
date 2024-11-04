<script setup lang="ts">
import type { INode } from 'n8n-workflow';
import { computed } from 'vue';
import RunDataAi from '@/components/RunDataAi/RunDataAi.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';

const emit = defineEmits<{
	close: [];
}>();

const workflowsStore = useWorkflowsStore();

const workflow = computed(() => workflowsStore.getCurrentWorkflow());
defineProps<{
	node: INode | null;
}>();
</script>

<template>
	<div :class="$style.logsWrapper" data-test-id="lm-chat-logs">
		<header :class="$style.logsHeader">
			<div class="meta">
				Latest Logs <span v-if="node">from {{ node?.name }} node</span>
			</div>
			<n8n-icon-button
				:class="$style.close"
				outline
				icon="times"
				type="secondary"
				size="mini"
				@click="emit('close')"
			/>
		</header>
		<div :class="$style.logs">
			<RunDataAi
				v-if="node"
				:class="$style.runData"
				:node="node"
				hide-title
				:workflow="workflow"
				slim
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.logsHeader {
	font-size: var(--font-size-m);
	font-weight: 400;
	height: 2.6875rem;
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color-foreground-base);
	padding: var(--spacing-xs);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;

	.close {
		border: none;
	}

	> span {
		font-size: var(--font-size-s);
		color: var(--color-text-base);
	}
}
.logsWrapper {
	--node-icon-color: var(--color-text-base);

	height: 100%;
	overflow: hidden;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.logsTitle {
	margin: 0 var(--spacing-s) var(--spacing-s);
}
.logs {
	padding: var(--spacing-s) 0;
	flex-grow: 1;
	overflow: auto;
}
</style>
