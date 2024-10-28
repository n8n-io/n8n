<script setup lang="ts">
import type { INode } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { defineAsyncComponent } from 'vue';

const LazyRunDataAi = defineAsyncComponent(
	async () => await import('@/components/RunDataAi/RunDataAi.vue'),
);

defineProps<{
	node: INode | null;
	messagesLength: number;
}>();
</script>

<template>
	<div :class="$style.logsWrapper" data-test-id="lm-chat-logs">
		<header :class="$style.logsHeader">
			Latest Logs <span v-if="node">from {{ node?.name }} node</span>
		</header>
		<div :class="$style.logs">
			<LazyRunDataAi
				v-if="node"
				:class="$style.runData"
				:key="messagesLength"
				:node="node"
				hide-title
				slim
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.logsHeader {
	font-size: var(--font-size-m);
	font-weight: 400;
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color-foreground-base);
	padding: var(--spacing-xs);
	background-color: var(--color-foreground-xlight);

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

	& ::-webkit-scrollbar {
		width: 4px;
	}

	& ::-webkit-scrollbar-thumb {
		border-radius: var(--border-radius-base);
		background: var(--color-foreground-dark);
		border: 1px solid white;
	}

	& ::-webkit-scrollbar-thumb:hover {
		background: var(--color-foreground-xdark);
	}
}
</style>
