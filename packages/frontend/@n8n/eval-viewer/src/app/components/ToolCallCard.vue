<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import type { TranscriptItem } from '../../schema';
import { useToolColor } from '../colors';
import { formatNumber } from '../format';
import ValueBlock from './ValueBlock.vue';

type ToolItem = Extract<TranscriptItem, { kind: 'tool' }>;

const props = defineProps<{ item: ToolItem; open: boolean; highlighted: boolean }>();
const toolColor = useToolColor();

const isOpen = ref(props.open);
watch(
	() => props.open,
	(open) => {
		isOpen.value = open;
	},
);

const action = computed(() => {
	const args = props.item.args;
	if (typeof args !== 'object' || args === null || !('action' in args)) return null;
	return typeof args.action === 'string' ? args.action : null;
});
const resultSize = computed(() =>
	props.item.hasResult
		? `${formatNumber(JSON.stringify(props.item.result ?? null).length)} chars`
		: null,
);
</script>

<template>
	<div
		:class="[$style.card, highlighted && $style.highlighted]"
		:data-item-id="item.id"
		:data-test-id="`tool-call-${item.tool}`"
	>
		<button type="button" :class="$style.header" :aria-expanded="isOpen" @click="isOpen = !isOpen">
			<N8nIcon :icon="isOpen ? 'chevron-down' : 'chevron-right'" size="small" />
			<N8nIcon
				v-if="item.hasResult"
				:icon="item.failed ? 'x' : 'check'"
				:color="item.failed ? 'danger' : 'success'"
				size="small"
				:aria-label="item.failed ? 'failed' : 'succeeded'"
			/>
			<N8nText v-else size="small" color="text-light" title="No result recorded">…</N8nText>
			<span :class="$style.swatch" :style="{ backgroundColor: `var(${toolColor(item.tool)})` }" />
			<code :class="$style.name">{{ item.tool }}</code>
			<N8nText v-if="action" size="small">{{ action }}</N8nText>
			<N8nText v-if="resultSize" size="xsmall" color="text-light">{{ resultSize }}</N8nText>
		</button>
		<div v-if="isOpen" :class="$style.body">
			<N8nText size="xsmall" bold color="text-light">INPUT</N8nText>
			<ValueBlock :value="item.args" />
			<N8nText size="xsmall" bold color="text-light">OUTPUT</N8nText>
			<ValueBlock :value="item.hasResult ? item.result : undefined" />
		</div>
	</div>
</template>

<style module>
.card {
	border: var(--border);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
}

.highlighted {
	outline: var(--spacing--5xs) solid var(--border-color--info);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
	user-select: none;
}

.name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
}

.swatch {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm);
	border-top: var(--border);
}
</style>
