<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { FilterOption } from '../session-timeline.types';

const props = defineProps<{
	available: FilterOption[];
	selected: Set<string>;
}>();

const emit = defineEmits<{ update: [next: Set<string>] }>();

const i18n = useI18n();

const open = ref(false);

function toggle(key: string, checked: boolean): void {
	const next = new Set(props.selected);
	if (checked) next.add(key);
	else next.delete(key);
	emit('update', next);
}

function clearAll(): void {
	emit('update', new Set());
}
</script>

<template>
	<div :class="$style.root">
		<button
			type="button"
			data-test-id="filter-trigger"
			:class="$style.trigger"
			@click="open = !open"
		>
			<N8nIcon icon="funnel" :size="12" />
			<span>{{ i18n.baseText('agentSessions.timeline.events') }}</span>
			<span v-if="props.selected.size > 0">&nbsp;({{ props.selected.size }})</span>
		</button>
		<div v-if="open" :class="$style.panel">
			<label
				v-for="opt in props.available"
				:key="opt.key"
				:data-test-id="`filter-option-${opt.key}`"
				:class="$style.option"
			>
				<input
					type="checkbox"
					:checked="props.selected.has(opt.key)"
					@change="toggle(opt.key, ($event.target as HTMLInputElement).checked)"
				/>
				<span
					:class="$style.swatch"
					:style="{ backgroundColor: `color-mix(in srgb, ${opt.color} 45%, transparent)` }"
				/>
				<span :class="$style.label">{{ opt.label }}</span>
				<span :class="$style.count">{{ opt.count }}</span>
			</label>
			<button
				v-if="props.selected.size > 0"
				type="button"
				data-test-id="filter-clear"
				:class="$style.clear"
				@click="clearAll"
			>
				{{ i18n.baseText('agentSessions.timeline.clearFilter') }}
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	position: relative;
}
.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;
	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
.panel {
	position: absolute;
	left: 0;
	top: calc(100% + var(--spacing--3xs));
	background-color: var(--color--foreground--tint-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	padding: var(--spacing--sm) var(--spacing--md);
	min-width: 280px;
	z-index: 10;
}
.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
	cursor: pointer;
}
.swatch {
	width: 10px;
	height: 10px;
	border-radius: 2px;
}
.label {
	flex: 1;
}
.count {
	color: var(--color--text--tint-2);
}
.clear {
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--4xs);
	background: none;
	border: none;
	color: var(--color--primary);
	font-size: var(--font-size--3xs);
	cursor: pointer;
}
</style>
