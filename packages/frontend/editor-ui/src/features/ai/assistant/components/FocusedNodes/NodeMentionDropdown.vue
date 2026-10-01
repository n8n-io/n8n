<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

interface Props {
	nodes: INodeUi[];
	selectedNodeIds: string[];
	highlightedIndex: number;
	position: { top: number; left?: number; right?: number };
	searchQuery: string;
	viaButton?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	select: [node: INodeUi];
	highlight: [index: number];
	keydown: [event: KeyboardEvent];
	close: [];
	'update:searchQuery': [query: string];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLDivElement | null>(null);
const localQuery = ref(props.searchQuery);

watch(
	() => props.searchQuery,
	(newQuery) => {
		localQuery.value = newQuery;
	},
);

watch(localQuery, (newQuery) => {
	emit('update:searchQuery', newQuery);
});

const positionStyle = computed(() => {
	const style: Record<string, string> = {
		top: `${props.position.top}px`,
		transform: 'translateY(-100%)',
	};
	if (props.position.right !== undefined) {
		style.right = `${props.position.right}px`;
	} else if (props.position.left !== undefined) {
		style.left = `${props.position.left}px`;
	}
	return style;
});

function getNodeType(nodeTypeName: string) {
	return nodeTypesStore.getNodeType(nodeTypeName);
}

function handleSelect(node: INodeUi) {
	emit('select', node);
}

function handleMouseEnter(index: number) {
	emit('highlight', index);
}

function handleKeyDown(event: KeyboardEvent) {
	emit('keydown', event);
}

function handleClickOutside(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (!target.closest('[data-node-mention-dropdown]')) {
		emit('close');
	}
}

watch(
	() => props.highlightedIndex,
	(index) => {
		void nextTick(() => {
			const listElement = listRef.value;
			if (!listElement) return;
			const items = listElement.querySelectorAll('[data-mention-item]');
			const highlightedItem = items[index] as HTMLElement | undefined;
			highlightedItem?.scrollIntoView({ block: 'nearest' });
		});
	},
);

onMounted(() => {
	if (props.viaButton) {
		void nextTick(() => {
			inputRef.value?.focus();
		});
	}
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
	<Teleport to="body">
		<div data-node-mention-dropdown :class="$style.dropdown" :style="positionStyle">
			<!-- Search input (only shown when opened via button) -->
			<div v-if="viaButton" :class="$style.searchWrapper">
				<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
				<input
					ref="inputRef"
					v-model="localQuery"
					type="text"
					:class="$style.searchInput"
					:placeholder="i18n.baseText('focusedNodes.mentionPlaceholder')"
					@keydown="handleKeyDown"
				/>
			</div>

			<!-- Node list -->
			<div ref="listRef" :class="$style.list">
				<div
					v-for="(node, index) in nodes"
					:key="node.id"
					data-mention-item
					:class="[
						$style.item,
						{ [$style.highlighted]: index === highlightedIndex },
						{ [$style.selected]: selectedNodeIds.includes(node.id) },
					]"
					@click="handleSelect(node)"
					@mouseenter="handleMouseEnter(index)"
				>
					<NodeIcon :node-type="getNodeType(node.type)" :size="16" />
					<span :class="$style.nodeName">{{ node.name }}</span>
					<N8nIcon
						v-if="selectedNodeIds.includes(node.id)"
						icon="check"
						size="small"
						:class="$style.checkIcon"
					/>
				</div>

				<!-- Empty state -->
				<div v-if="nodes.length === 0" :class="$style.emptyState">
					{{ i18n.baseText('focusedNodes.noMatches', { interpolate: { query: searchQuery } }) }}
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.dropdown {
	background: var(--color--background--light-3);
	border: 0.5px solid var(--color--foreground);
	border-radius: var(--radius);
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.1),
		0 3px 8px rgba(0, 0, 0, 0.1);
	z-index: 9999;
	position: fixed;
	min-width: 200px;
	max-width: 300px;
}

.searchWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.searchIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.searchInput {
	flex: 1;
	height: 24px;
	padding: 0;
	border: none;
	font-size: var(--font-size--sm);
	background: transparent;
	color: var(--color--text);
	outline: none;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.list {
	padding: var(--spacing--4xs);
	max-height: 320px;
	overflow-y: auto;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: 32px;
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	transition: background-color 0.1s ease;

	&:hover,
	&.highlighted {
		background: light-dark(var(--color--foreground--tint-1), var(--color--foreground--tint-2));
	}

	&.selected {
		background-color: light-dark(var(--color--success--tint-3), var(--color--success--tint-4));
	}

	&.selected:hover,
	&.selected.highlighted {
		background-color: light-dark(var(--color--success--tint-2), var(--color--success--tint-3));
	}
}

.nodeName {
	flex: 1;
	font-size: var(--font-size--sm);
	line-height: 20px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color--text);
}

.checkIcon {
	color: var(--color--success);
}

.emptyState {
	padding: var(--spacing--sm);
	text-align: center;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}
</style>
