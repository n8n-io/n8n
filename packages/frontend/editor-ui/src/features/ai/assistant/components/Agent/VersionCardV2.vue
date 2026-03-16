<script lang="ts" setup>
import { computed, ref } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nIcon } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import RestoreVersionConfirm from '@n8n/design-system/components/AskAssistantChat/messages/RestoreVersionConfirm.vue';
import type { NodeChangeEntry } from '@/features/ai/assistant/composables/useReviewChanges';

type VersionCardAction = 'openDiff' | 'restore' | 'showInHistory';

const props = defineProps<{
	versionId: string;
	isCurrent: boolean;
	nodeChanges: NodeChangeEntry[];
	streaming?: boolean;
	pruneTimeHours?: number;
	title?: string;
}>();

const emit = defineEmits<{
	openDiff: [];
	restore: [versionId: string];
	showInHistory: [versionId: string];
	selectNode: [nodeId: string];
}>();

const i18n = useI18n();
const isExpanded = ref(false);
const showRestoreConfirm = ref(false);
const menuButtonRef = ref<{ $el: HTMLElement } | null>(null);
const restoreConfirmRef = ref<HTMLElement | null>(null);

onClickOutside(restoreConfirmRef, () => {
	if (showRestoreConfirm.value) {
		showRestoreConfirm.value = false;
	}
});

const menuButtonElement = computed(() => {
	if (!menuButtonRef.value?.$el) return null;
	return menuButtonRef.value.$el as HTMLElement;
});
const menuButtonBounding = useElementBounding(menuButtonElement);

const confirmModalStyle = computed(() => {
	if (!showRestoreConfirm.value) return {};
	return {
		position: 'fixed' as const,
		top: `${menuButtonBounding.bottom.value + 8}px`,
		right: `${window.innerWidth - menuButtonBounding.right.value}px`,
		zIndex: 9999,
	};
});

const menuItems = computed<Array<ActionDropdownItem<VersionCardAction>>>(() => {
	const items: Array<ActionDropdownItem<VersionCardAction>> = [
		{
			id: 'openDiff',
			label: i18n.baseText('aiAssistant.versionCard.menu.openDiff'),
			icon: 'file-diff',
		},
	];

	if (!props.isCurrent) {
		items.push({
			id: 'restore',
			label: i18n.baseText('aiAssistant.versionCard.menu.restore'),
			icon: 'undo-2',
		});
	}

	items.push({
		id: 'showInHistory',
		label: i18n.baseText('aiAssistant.versionCard.menu.showInHistory'),
		icon: 'history',
	});

	return items;
});

function toggleExpanded() {
	isExpanded.value = !isExpanded.value;
}

function onMenuSelect(action: VersionCardAction) {
	switch (action) {
		case 'openDiff':
			emit('openDiff');
			break;
		case 'restore':
			showRestoreConfirm.value = true;
			break;
		case 'showInHistory':
			emit('showInHistory', props.versionId);
			break;
	}
}

function onRestoreConfirm() {
	emit('restore', props.versionId);
	showRestoreConfirm.value = false;
}

function onShowVersion(versionId: string) {
	emit('showInHistory', versionId);
}
</script>

<template>
	<div :class="[$style.container, isCurrent && $style.current]" data-test-id="version-card">
		<div
			:class="$style.header"
			role="button"
			tabindex="0"
			@click="toggleExpanded"
			@keydown.enter="toggleExpanded"
		>
			<div :class="$style.headerLeft">
				<N8nIcon
					icon="chevron-right"
					size="small"
					:class="[$style.chevron, isExpanded && $style.chevronExpanded]"
				/>
				<span :class="$style.label">
					{{ title || i18n.baseText('aiAssistant.versionCard.version') }}
				</span>
			</div>
			<N8nActionDropdown
				ref="menuButtonRef"
				:items="menuItems"
				activator-icon="ellipsis"
				activator-size="small"
				placement="bottom-end"
				:teleported="true"
				data-test-id="version-card-menu"
				@click.stop
				@select="onMenuSelect"
			/>
		</div>

		<div v-if="isExpanded" :class="$style.changesList">
			<div
				v-for="change in nodeChanges"
				:key="change.node.id"
				:class="$style.changeItem"
				role="button"
				tabindex="0"
				data-test-id="version-card-change-item"
				@click="emit('selectNode', change.node.id)"
				@keydown.enter="emit('selectNode', change.node.id)"
			>
				<DiffBadge :type="change.status" />
				<N8nIcon icon="pen" size="small" :class="$style.penIcon" />
				<NodeIcon
					v-if="change.nodeType"
					:node-type="change.nodeType"
					:size="16"
					:class="$style.nodeIcon"
				/>
				<span :class="$style.nodeName">{{ change.node.name }}</span>
			</div>
		</div>

		<Teleport to="body">
			<div v-if="showRestoreConfirm" ref="restoreConfirmRef" :style="confirmModalStyle">
				<RestoreVersionConfirm
					:version-id="versionId"
					:prune-time-hours="pruneTimeHours"
					@confirm="onRestoreConfirm"
					@cancel="showRestoreConfirm = false"
					@show-version="onShowVersion"
				/>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.container {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	overflow: hidden;
	padding: var(--spacing--2xs);
}

.current {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 3px var(--color--primary--tint-3);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	cursor: pointer;
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chevron {
	transition: transform 0.2s ease;
	color: var(--color--text);
	flex-shrink: 0;
}

.chevronExpanded {
	transform: rotate(90deg);
}

.label {
	font-size: var(--font-size--sm);
	font-weight: 500;
	color: var(--color--text);
	white-space: nowrap;
}

.changesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--2xs);
}

.changeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.penIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.nodeIcon {
	flex-shrink: 0;
}

.nodeName {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	min-width: 0;
}
</style>
