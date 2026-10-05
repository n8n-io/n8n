<script setup lang="ts">
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { computed, nextTick, ref, watch } from 'vue';

import type { Turn } from '../../schema';
import ToolCallCard from './ToolCallCard.vue';
import ValueBlock from './ValueBlock.vue';

/** `focus` is a tool call id or `turn-<n>`; the panel scrolls to it and opens it. */
const props = defineProps<{ turns: Turn[]; focus: string | null }>();

const filter = ref('');
const allOpen = ref(false);
const openGeneration = ref(0);

const tools = computed(() => [
	...new Set(
		props.turns.flatMap((turn) =>
			turn.items.flatMap((item) => (item.kind === 'tool' ? [item.tool] : [])),
		),
	),
]);
const matches = (tool: string) =>
	!filter.value.trim() || tool.toLowerCase().includes(filter.value.trim().toLowerCase());

function setAll(open: boolean) {
	allOpen.value = open;
	openGeneration.value += 1;
}

const root = ref<HTMLElement>();
watch(
	() => props.focus,
	async (focus) => {
		if (!focus) return;
		await nextTick();
		const target = [...(root.value?.querySelectorAll<HTMLElement>('[data-item-id]') ?? [])].find(
			(element) => element.dataset.itemId === focus,
		);
		target?.scrollIntoView({ block: 'center' });
	},
	{ immediate: true },
);
</script>

<template>
	<div ref="root" :class="$style.panel" data-test-id="transcript-panel">
		<div :class="$style.toolbar">
			<N8nInput
				v-model="filter"
				size="small"
				placeholder="Filter tool calls by name"
				:class="$style.filter"
				aria-label="Filter tool calls by name"
				data-test-id="transcript-filter"
			/>
			<N8nButton variant="subtle" size="small" @click="setAll(true)">Expand all</N8nButton>
			<N8nButton variant="subtle" size="small" @click="setAll(false)">Collapse all</N8nButton>
			<N8nText size="xsmall" color="text-light">Tools: {{ tools.join(', ') }}</N8nText>
		</div>
		<section
			v-for="(turn, turnIndex) in turns"
			:key="turnIndex"
			:class="$style.turn"
			:data-item-id="`turn-${turnIndex}`"
		>
			<div :class="[$style.user, focus === `turn-${turnIndex}` && $style.highlighted]">
				<N8nText size="xsmall" bold color="text-light">USER · turn {{ turnIndex + 1 }}</N8nText>
				<N8nText tag="p" size="small" :class="$style.prewrap">{{ turn.userMessage }}</N8nText>
			</div>
			<template v-for="(item, itemIndex) in turn.items" :key="`${turnIndex}-${itemIndex}`">
				<N8nText v-if="item.kind === 'text'" tag="p" size="small" :class="$style.prewrap">
					{{ item.text }}
				</N8nText>
				<ToolCallCard
					v-else-if="item.kind === 'tool' && matches(item.tool)"
					:key="`${item.id}-${openGeneration}`"
					:item="item"
					:open="allOpen || focus === item.id"
					:highlighted="focus === item.id"
				/>
				<details v-else-if="item.kind === 'event'" :class="$style.event">
					<summary>
						<N8nText size="small" color="text-light">{{ item.type }}</N8nText>
					</summary>
					<ValueBlock :value="item.data" />
				</details>
			</template>
		</section>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing--2xs) 0;
	background-color: var(--background--surface);
}

.filter {
	max-width: var(--spacing--5xl);
}

.turn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.user {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--md);
	background-color: var(--background--info);
}

.highlighted {
	outline: var(--spacing--5xs) solid var(--border-color--info);
}

.prewrap {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}

.event {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--md);
}

.event summary {
	cursor: pointer;
}
</style>
