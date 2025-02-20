<script setup lang="ts">
import type { INode, Workflow } from 'n8n-workflow';
import RunDataAi from '@/components/RunDataAi/RunDataAi.vue';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	close: [];
}>();

defineProps<{
	node: INode | null;
	slim?: boolean;
	workflow: Workflow;
}>();

const locale = useI18n();
</script>

<template>
	<div :class="$style.logsWrapper" data-test-id="lm-chat-logs">
		<header :class="$style.logsHeader">
			<div class="meta">
				{{ locale.baseText('chat.window.logs') }}
				<span v-if="node">
					{{
						locale.baseText('chat.window.logsFromNode', { interpolate: { nodeName: node.name } })
					}}
				</span>
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
				:workflow="workflow"
				:slim="slim"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.logsHeader {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
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

	span {
		font-weight: 100;
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
