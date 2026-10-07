<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import type { AgentCodingStatus } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	changes: AgentCodingStatus['changes'];
	selected?: string;
	viewed: string[];
}>();
const emit = defineEmits<{ select: [path: string] }>();
const i18n = useI18n();
const collapsed = ref(new Set<string>());
const rows = computed(() => {
	const entries = new Map<
		string,
		{
			path: string;
			name: string;
			depth: number;
			directory: boolean;
			change?: AgentCodingStatus['changes'][number];
		}
	>();
	for (const change of props.changes) {
		const segments = change.path.split('/');
		segments.forEach((name, depth) => {
			const path = segments.slice(0, depth + 1).join('/');
			const directory = depth < segments.length - 1;
			entries.set(path, { path, name, depth, directory, change: directory ? undefined : change });
		});
	}
	return [...entries.values()]
		.sort((a, b) => a.path.localeCompare(b.path))
		.filter((row) => ![...collapsed.value].some((folder) => row.path.startsWith(`${folder}/`)));
});

function choose(row: (typeof rows.value)[number]) {
	if (!row.directory) return emit('select', row.path);
	if (collapsed.value.has(row.path)) collapsed.value.delete(row.path);
	else collapsed.value.add(row.path);
}
</script>

<template>
	<nav :class="$style.tree" :aria-label="i18n.baseText('agents.coding.changes')">
		<button
			v-for="row in rows"
			:key="row.path"
			type="button"
			:class="[$style.row, { [$style.selected]: selected === row.path }]"
			:style="{ paddingLeft: `calc(var(--spacing--2xs) + ${row.depth} * var(--spacing--xs))` }"
			:title="row.path"
			:aria-expanded="row.directory ? !collapsed.has(row.path) : undefined"
			:aria-current="selected === row.path ? 'true' : undefined"
			@click="choose(row)"
		>
			<N8nIcon
				v-if="row.directory"
				:icon="collapsed.has(row.path) ? 'chevron-right' : 'chevron-down'"
				size="small"
			/>
			<N8nIcon v-else :icon="viewed.includes(row.path) ? 'check' : 'file'" size="small" />
			<span :class="$style.name">{{ row.name }}</span>
			<span v-if="row.change" :class="$style.stat"
				><span :class="$style.added">+{{ row.change.additions }}</span>
				<span :class="$style.removed">−{{ row.change.deletions }}</span></span
			>
		</button>
	</nav>
</template>

<style lang="scss" module>
.tree {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	border: 0;
	border-radius: var(--radius--3xs);
	padding: var(--spacing--2xs);
	text-align: left;
	background: transparent;
	color: var(--text-color);
	cursor: pointer;
	font-size: var(--font-size--2xs);
}
.row:hover,
.selected {
	background: var(--background--subtle);
}
.name {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
.stat {
	font-size: var(--font-size--3xs);
	white-space: nowrap;
}
.added {
	color: light-dark(var(--color--green-800), var(--diff--color--new));
}
.removed {
	color: light-dark(var(--color--red-800), var(--diff--color--deleted));
}
</style>
