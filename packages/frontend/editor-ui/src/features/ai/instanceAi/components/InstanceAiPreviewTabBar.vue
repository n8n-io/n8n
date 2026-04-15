<script lang="ts" setup>
import { N8nIconButton } from '@n8n/design-system';
import { computed, nextTick, watch } from 'vue';
import type { ArtifactTab } from '../useCanvasPreview';

const props = defineProps<{
	tabs: ArtifactTab[];
	activeTabId: string | null;
}>();

const emit = defineEmits<{
	'update:activeTabId': [id: string];
	close: [];
}>();

const activeTab = computed(() => props.tabs.find((t) => t.id === props.activeTabId));

// Scroll the active tab into view when it changes (e.g. auto-switch on execution)
watch(
	() => props.activeTabId,
	(tabId) => {
		if (!tabId) return;
		void nextTick(() => {
			const el = document.querySelector(`[data-tab-id="${tabId}"]`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
		});
	},
);

const externalLinkHref = computed(() => {
	const tab = activeTab.value;
	if (!tab) return undefined;
	if (tab.type === 'workflow') return `/workflow/${tab.id}`;
	if (tab.type === 'data-table') {
		return tab.projectId ? `/projects/${tab.projectId}/datatables/${tab.id}` : '/home/datatables';
	}
	return undefined;
});
</script>

<template>
	<div :class="$style.header">
		<div :class="$style.tabStrip">
			<div
				v-for="tab in tabs"
				:key="tab.id"
				:data-tab-id="tab.id"
				:class="[$style.tab, tab.id === activeTabId ? $style.activeTab : '']"
				@click="emit('update:activeTabId', tab.id)"
			>
				<span :class="$style.tabLabel">{{ tab.name }}</span>
			</div>
		</div>
		<div :class="$style.actions">
			<N8nIconButton
				v-if="activeTab && externalLinkHref"
				icon="external-link"
				variant="ghost"
				size="medium"
				tag="a"
				:href="externalLinkHref"
				target="_blank"
			/>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="medium"
				data-test-id="instance-ai-preview-close"
				@click="emit('close')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--xs);
	border-bottom: var(--border);
	flex-shrink: 0;
	gap: var(--spacing--2xs);
	height: 50px;
}

.tabStrip {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: flex-end;
	overflow-x: auto;
	height: 100%;

	&::-webkit-scrollbar {
		display: none;
	}

	scrollbar-width: none;
}

.tab {
	display: flex;
	align-items: center;
	height: 100%;
	padding: 0 var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	white-space: nowrap;
	color: var(--color--text);
	border-bottom: 2px solid transparent;

	&:hover {
		color: var(--color--primary);
	}
}

.activeTab {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
}

.tabLabel {
	overflow: hidden;
	text-overflow: ellipsis;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}
</style>
