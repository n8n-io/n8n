<script setup lang="ts">
import { N8nCheckbox } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		tab: chrome.tabs.Tab;
		selectable?: boolean;
		selected?: boolean;
	}>(),
	{
		selectable: false,
		selected: false,
	},
);

const emit = defineEmits<{
	toggle: [tabId: number];
}>();

function handleClick(): void {
	if (props.selectable && props.tab.id !== undefined) {
		emit('toggle', props.tab.id);
	}
}

function hideFavicon(event: Event): void {
	if (event.target instanceof HTMLImageElement) {
		event.target.style.display = 'none';
	}
}
</script>

<template>
	<li :class="['tab-item', { 'tab-item--selectable': selectable }]" @click="handleClick">
		<N8nCheckbox
			v-if="selectable"
			:model-value="selected"
			@click.stop
			@update:model-value="handleClick"
		/>
		<img
			v-if="tab.favIconUrl"
			:src="tab.favIconUrl"
			alt=""
			class="tab-favicon"
			@error="hideFavicon"
		/>
		<div class="tab-info">
			<div class="tab-title">{{ tab.title ?? 'Untitled' }}</div>
			<div class="tab-url">{{ tab.url ?? '' }}</div>
		</div>
	</li>
</template>

<style scoped lang="scss">
.tab-item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) transparent;
}

.tab-item--selectable {
	cursor: pointer;

	&:hover {
		background: var(--background--surface--hover);
	}
}

.tab-favicon {
	width: 16px;
	height: 16px;
	border-radius: var(--radius--sm);
}

.tab-info {
	flex: 1;
	min-width: 0;
}

.tab-title {
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tab-url {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
