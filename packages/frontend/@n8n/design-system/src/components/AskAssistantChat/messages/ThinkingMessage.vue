<script setup lang="ts">
import { ref, computed } from 'vue';

import type { ChatUI } from '../../../types/assistant';
import N8nIcon from '../../N8nIcon';
import N8nText from '../../N8nText';

interface Props {
	items: ChatUI.ThinkingItem[];
	latestStatusText: string;
	isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isStreaming: false,
});

const isExpanded = ref(false);

const hasRunningItem = computed(() => props.items.some((item) => item.status === 'running'));

const shouldShowShimmer = computed(() => hasRunningItem.value && !isExpanded.value);

const toggleExpanded = () => {
	isExpanded.value = !isExpanded.value;
};

function getIconForStatus(status: ChatUI.ThinkingItem['status']) {
	switch (status) {
		case 'completed':
			return { icon: 'circle-check' as const, color: 'success' as const };
		case 'running':
			return { icon: 'spinner' as const, color: 'secondary' as const, spin: true };
		case 'error':
			return { icon: 'triangle-alert' as const, color: 'warning' as const };
		default:
			return { icon: 'circle' as const, color: 'text-light' as const };
	}
}
</script>

<template>
	<div :class="$style.thinkingContainer">
		<!-- Collapsed header with shimmer -->
		<button :class="$style.header" type="button" @click="toggleExpanded">
			<N8nIcon
				:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
				:class="$style.chevron"
				size="small"
			/>
			<span :class="[$style.statusText, { [$style.shimmer]: shouldShowShimmer }]">
				{{ latestStatusText }}
			</span>
		</button>

		<!-- Expanded item list -->
		<Transition name="expand">
			<div v-if="isExpanded" :class="$style.itemList">
				<div v-for="item in items" :key="item.id" :class="$style.item">
					<N8nIcon
						:icon="getIconForStatus(item.status).icon"
						:color="getIconForStatus(item.status).color"
						:spin="getIconForStatus(item.status).spin"
						size="small"
						:class="$style.itemIcon"
					/>
					<N8nText size="small" :class="$style.itemText">
						{{ item.displayTitle }}
					</N8nText>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
@use '../../../css/mixins/animations';

.thinkingContainer {
	margin: var(--spacing--2xs) 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	background: transparent;
	border: none;
	cursor: pointer;
	width: 100%;
	text-align: left;

	&:hover {
		opacity: 0.8;
	}
}

.chevron {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.statusText {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
}

.shimmer {
	@include animations.shimmer;
}

.itemList {
	padding-left: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.itemIcon {
	flex-shrink: 0;
	width: var(--spacing--sm);
}

.itemText {
	color: var(--color--text--tint-1);
}
</style>

<style lang="scss" scoped>
// Expand transition
.expand-enter-active,
.expand-leave-active {
	transition: all 0.2s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	opacity: 0;
	max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
	opacity: 1;
	max-height: 500px;
}
</style>
