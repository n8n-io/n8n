<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nPopover } from '@n8n/design-system';
import type { FilterOption } from '../session-timeline.types';
import { swatchBackground } from '../session-timeline.styles';

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
	<N8nPopover v-model:open="open" side="bottom" align="end" :content-class="$style.panel">
		<template #trigger>
			<N8nButton variant="outline" icon="funnel" data-test-id="filter-trigger">
				<span>{{ i18n.baseText('agentSessions.timeline.events') }}</span>
				<span v-if="props.selected.size > 0">&nbsp;({{ props.selected.size }})</span>
			</N8nButton>
		</template>
		<template #content>
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
				<span :class="$style.swatch" :style="{ backgroundColor: swatchBackground(opt.color) }" />
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
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.panel {
	padding: var(--spacing--sm) var(--spacing--md);
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
	color: var(--color--text);
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
