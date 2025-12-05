<script setup lang="ts">
import { ref, computed } from 'vue';

import type { ChatUI } from '../../../types/assistant';
import N8nIcon from '../../N8nIcon';

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

const shouldShowShimmer = computed(() => hasRunningItem.value);

const toggleExpanded = () => {
	isExpanded.value = !isExpanded.value;
};

function getIconForStatus(status: ChatUI.ThinkingItem['status']) {
	switch (status) {
		case 'completed':
			return { icon: 'circle-check' as const, spin: false };
		case 'running':
			return { icon: 'spinner' as const, spin: true };
		case 'error':
			return { icon: 'triangle-alert' as const, spin: false };
		default:
			return { icon: 'circle' as const, spin: false };
	}
}
</script>

<template>
	<div :class="$style.thinkingContainer">
		<!-- Collapsed header with shimmer -->
		<button :class="$style.header" type="button" @click="toggleExpanded">
			<span :class="[$style.statusText, { [$style.shimmer]: shouldShowShimmer }]">
				{{ latestStatusText }}
			</span>
			<N8nIcon :icon="isExpanded ? 'chevron-down' : 'chevron-right'" :class="$style.chevron" />
		</button>

		<!-- Expanded item list -->
		<Transition name="expand">
			<div v-if="isExpanded" :class="$style.itemList">
				<div v-for="item in items" :key="item.id" :class="$style.item">
					<N8nIcon
						:icon="getIconForStatus(item.status).icon"
						:spin="getIconForStatus(item.status).spin"
						:class="$style.itemIcon"
					/>
					<span :class="$style.itemText">
						{{ item.displayTitle }}
					</span>
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
	gap: var(--spacing--4xs);
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
	color: var(--assistant--color--text--subtle);
	flex-shrink: 0;
	width: var(--font-size--lg);
	height: var(--font-size--lg);
	padding-top: 1px;

	svg {
		width: var(--font-size--lg);
		height: var(--font-size--lg);
	}
}

.statusText {
	color: var(--assistant--color--text--subtle);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
}

.shimmer {
	@include animations.shimmer;
}

.itemList {
	padding-left: var(--spacing--4xs);
	padding-bottom: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.itemIcon {
	flex-shrink: 0;
	width: var(--font-size--md);
	height: var(--font-size--md);
	color: var(--assistant--icon-color--subtle);

	svg {
		width: var(--font-size--md);
		height: var(--font-size--md);
	}
}

.itemText {
	color: var(--assistant--color--text--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
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
