<script lang="ts" setup>
import { computed, watch, nextTick } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
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
				<N8nIcon :icon="tab.icon" size="medium" :class="$style.tabIcon" />
				<span :class="$style.tabLabel">{{ tab.name }}</span>
				<N8nIcon
					v-if="tab.executionStatus === 'running'"
					data-test-id="execution-status-running"
					icon="spinner"
					:spin="true"
					size="small"
					:class="$style.statusRunning"
				/>
				<N8nIcon
					v-else-if="tab.executionStatus === 'success'"
					data-test-id="execution-status-success"
					icon="check"
					size="small"
					:class="$style.statusSuccess"
				/>
				<N8nIcon
					v-else-if="tab.executionStatus === 'error'"
					data-test-id="execution-status-error"
					icon="x"
					size="small"
					:class="$style.statusError"
				/>
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
			<N8nIconButton icon="x" variant="ghost" size="medium" @click="emit('close')" />
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.tabStrip {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	overflow-x: auto;

	&::-webkit-scrollbar {
		display: none;
	}

	scrollbar-width: none;
}

.tab {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm);
	padding-bottom: calc(var(--spacing--2xs) + 2px);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	white-space: nowrap;
	color: var(--color--text);

	&:hover {
		color: var(--color--primary);
	}
}

.activeTab {
	color: var(--color--primary);
	padding-bottom: var(--spacing--2xs);
	border-bottom: var(--color--primary) 2px solid;
}

.tabIcon {
	flex-shrink: 0;
}

.tabLabel {
	overflow: hidden;
	text-overflow: ellipsis;
}

.statusRunning {
	color: var(--color--primary);
	flex-shrink: 0;
}

.statusSuccess {
	color: var(--color--success);
	flex-shrink: 0;
}

.statusError {
	color: var(--color--danger);
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}
</style>
