<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type { FilterOption } from '../session-timeline.types';
import { swatchBackground } from '../session-timeline.styles';

const props = defineProps<{
	available: FilterOption[];
	selected: Set<string>;
}>();

const emit = defineEmits<{ update: [next: Set<string>] }>();

const i18n = useI18n();

const RESET_ID = '__reset__';
const EVENTS_HEADER_ID = '__events__';
const STATUS_HEADER_ID = '__status__';

type FilterMenuItem = DropdownMenuItemProps<string, { option?: FilterOption }>;

const menuItems = computed<FilterMenuItem[]>(() => {
	const eventOptions = props.available.filter((option) => option.presentation === 'swatch');
	const statusOptions = props.available.filter((option) => option.presentation === 'badge');
	const items: FilterMenuItem[] = [];

	if (eventOptions.length > 0) {
		items.push({
			id: EVENTS_HEADER_ID,
			label: i18n.baseText('agentSessions.timeline.events'),
			header: true,
		});
		items.push(...eventOptions.map(toMenuItem));
	}

	if (statusOptions.length > 0) {
		items.push({
			id: STATUS_HEADER_ID,
			label: i18n.baseText('agentSessions.timeline.status'),
			header: true,
		});
		items.push(...statusOptions.map(toMenuItem));
	}

	items.push({
		id: RESET_ID,
		label: i18n.baseText('generic.reset'),
		divided: true,
		disabled: props.selected.size === 0,
		testId: 'filter-clear',
	});

	return items;
});

function toMenuItem(option: FilterOption): FilterMenuItem {
	return {
		id: option.key,
		label: option.label,
		checked: props.selected.has(option.key),
		keepOpen: true,
		testId: `filter-option-${option.key}`,
		data: { option },
	};
}

function optionColor(option: FilterOption): string {
	if (option.presentation === 'swatch') return option.color;

	switch (option.key) {
		case 'approved':
			return 'var(--color--green-600)';
		case 'error':
			return 'var(--color--red-600)';
		default:
			return 'var(--color--neutral-600)';
	}
}

function handleSelect(key: string): void {
	if (key === RESET_ID) {
		emit('update', new Set());
		return;
	}

	const next = new Set(props.selected);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	emit('update', next);
}
</script>

<template>
	<N8nDropdownMenu :items="menuItems" placement="bottom-end" @select="handleSelect">
		<template #trigger>
			<N8nTooltip :content="i18n.baseText('agentSessions.timeline.events')" placement="top">
				<span :class="$style.trigger">
					<N8nButton
						variant="outline"
						icon="funnel"
						icon-only
						:aria-label="i18n.baseText('agentSessions.timeline.events')"
						data-test-id="filter-trigger"
					/>
					<span v-if="props.selected.size > 0" :class="$style.activeIndicator" aria-hidden="true" />
				</span>
			</N8nTooltip>
		</template>

		<template #item-leading="{ item, ui }">
			<span
				v-if="item.data?.option"
				:class="[$style.swatch, ui.class]"
				:style="{ backgroundColor: swatchBackground(optionColor(item.data.option)) }"
			/>
		</template>

		<template #item-label="{ item, ui }">
			<span :class="ui.class">
				{{ item.label }}
				<span v-if="item.data?.option" :class="$style.count">
					{{ item.data.option.count }}
				</span>
			</span>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.trigger {
	position: relative;
	display: inline-flex;
}

.activeIndicator {
	position: absolute;
	top: calc(var(--spacing--3xs) * -0.5);
	right: calc(var(--spacing--3xs) * -0.5);
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	outline: var(--spacing--5xs) solid var(--background--surface);
	border-radius: var(--radius--full);
	background: var(--color--primary);
	pointer-events: none;
}

.swatch {
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	border-radius: var(--radius--4xs);
}

.count {
	color: var(--text-color--subtle);
}
</style>
