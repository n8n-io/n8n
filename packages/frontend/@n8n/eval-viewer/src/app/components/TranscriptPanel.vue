<script setup lang="ts">
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { TranscriptItem, Turn } from '../../schema';
import { skillsOf, skillTargetOf } from '../skills';
import ToolCallCard from './ToolCallCard.vue';
import ValueBlock from './ValueBlock.vue';

const props = defineProps<{ turns: Turn[] }>();

const skills = computed(() => skillsOf(props.turns));

type Entry = { thought: string } | { item: TranscriptItem };

/**
 * The items of a turn with the thinking of each step before the first tool call of that step.
 * A step without a matching tool call (often the last one) goes before the final text, else last.
 */
function entriesOf(turn: Turn): Entry[] {
	const lastTool = turn.items.findLastIndex((item) => item.kind === 'tool');
	const finalText = turn.items.findLastIndex((item) => item.kind === 'text');
	const fallback = finalText > lastTool ? finalText : -1;
	const placed = turn.steps.flatMap((step) => {
		if (!step.reasoning) return [];
		const ids = step.toolCalls.map((call) => call.id);
		const at = turn.items.findIndex((item) => item.kind === 'tool' && ids.includes(item.id));
		return [{ at: at >= 0 ? at : fallback, thought: step.reasoning }];
	});
	const thoughtsAt = (at: number): Entry[] =>
		placed.filter((entry) => entry.at === at).map(({ thought }) => ({ thought }));
	return [
		...turn.items.flatMap((item, index) => [...thoughtsAt(index), { item }]),
		...thoughtsAt(-1),
	];
}
const entries = computed(() => props.turns.map(entriesOf));

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
</script>

<template>
	<div :class="$style.panel" data-test-id="transcript-panel">
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
		<section v-for="(turn, turnIndex) in turns" :key="turnIndex" :class="$style.turn">
			<div :class="$style.user">
				<N8nText size="xsmall" bold color="text-light">USER · turn {{ turnIndex + 1 }}</N8nText>
				<N8nText tag="p" size="small" :class="$style.prewrap">{{ turn.userMessage }}</N8nText>
			</div>
			<template
				v-for="(entry, entryIndex) in entries[turnIndex]"
				:key="`${turnIndex}-${entryIndex}`"
			>
				<details
					v-if="'thought' in entry"
					:key="`thought-${entryIndex}-${openGeneration}`"
					:open="allOpen"
					:class="$style.thinking"
					data-test-id="transcript-thinking"
				>
					<summary>
						<N8nText size="xsmall" bold color="text-light">THINKING</N8nText>
						<N8nText size="small" color="text-light" :class="$style.preview">
							{{ entry.thought }}
						</N8nText>
					</summary>
					<N8nText tag="p" size="small" color="text-light" :class="$style.prewrap">
						{{ entry.thought }}
					</N8nText>
				</details>
				<N8nText
					v-else-if="entry.item.kind === 'text'"
					tag="p"
					size="small"
					:class="$style.prewrap"
				>
					{{ entry.item.text }}
				</N8nText>
				<ToolCallCard
					v-else-if="entry.item.kind === 'tool' && matches(entry.item.tool)"
					:key="`${entry.item.id}-${openGeneration}`"
					:item="entry.item"
					:open="allOpen"
					:skill="skillTargetOf(skills, entry.item)"
				/>
				<details v-else-if="entry.item.kind === 'event'" :class="$style.event">
					<summary>
						<N8nText size="small" color="text-light">{{ entry.item.type }}</N8nText>
					</summary>
					<ValueBlock :value="entry.item.data" />
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

.prewrap {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}

.thinking {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-inline-start: var(--spacing--5xs) solid var(--color--purple-300);
}

.thinking summary {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	cursor: pointer;
}

.thinking[open] .preview {
	display: none;
}

.preview {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
