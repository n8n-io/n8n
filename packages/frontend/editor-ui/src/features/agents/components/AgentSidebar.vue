<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

defineProps<{
	activeTab: string;
}>();

const emit = defineEmits<{
	select: [tabId: string];
}>();

interface SidebarTab {
	id: string;
	label: string;
	icon: IconName;
}

const mainTabs: SidebarTab[] = [
	{ id: 'code', label: 'Code', icon: 'code' },
	{ id: 'overview', label: 'Overview', icon: 'info' },
	{ id: 'prompts', label: 'Prompts', icon: 'message-square' },
	{ id: 'tools', label: 'Tools', icon: 'wrench' },
	{ id: 'memory', label: 'Memory', icon: 'brain' },
	{ id: 'evaluations', label: 'Evaluations', icon: 'flask-conical' },
	{ id: 'integrations', label: 'Integrations', icon: 'plug' },
];

const bottomTabs: SidebarTab[] = [
	{ id: 'versions', label: 'Versions', icon: 'git-branch' },
	{ id: 'deployments', label: 'Deployments', icon: 'cloud' },
];

function onSelect(tabId: string) {
	emit('select', tabId);
}
</script>

<template>
	<aside :class="$style.sidebar">
		<nav :class="$style.mainNav">
			<button
				v-for="tab in mainTabs"
				:key="tab.id"
				:class="[$style.tab, activeTab === tab.id && $style.tabActive]"
				:data-testid="`sidebar-tab-${tab.id}`"
				@click="onSelect(tab.id)"
			>
				<N8nIcon :icon="tab.icon" :size="16" />
				<span :class="$style.tabLabel">{{ tab.label }}</span>
			</button>
		</nav>
		<div :class="$style.bottomNav">
			<button
				v-for="tab in bottomTabs"
				:key="tab.id"
				:class="[$style.tab, activeTab === tab.id && $style.tabActive]"
				:data-testid="`sidebar-tab-${tab.id}`"
				@click="onSelect(tab.id)"
			>
				<N8nIcon :icon="tab.icon" :size="16" />
				<span :class="$style.tabLabel">{{ tab.label }}</span>
			</button>
		</div>
	</aside>
</template>

<style module>
.sidebar {
	width: 180px;
	min-width: 180px;
	background-color: var(--color--foreground--tint-2);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow-y: auto;
}

.mainNav {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;
}

.bottomNav {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.tab {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	text-align: left;
	width: 100%;
	transition: background-color 0.15s ease;
}

.tab:hover {
	background-color: var(--color--foreground--tint-2);
}

.tabActive {
	color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.tabActive:hover {
	background-color: var(--color--primary--tint-2);
}

.tabLabel {
	line-height: var(--line-height--xl);
}
</style>
