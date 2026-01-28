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
	position: { top: number; left: number };
	searchQuery: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	select: [node: INodeUi];
	highlight: [index: number];
	keydown: [event: KeyboardEvent];
	close: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const inputRef = ref<HTMLInputElement | null>(null);
const localQuery = ref(props.searchQuery);

// Sync local query with prop
watch(
	() => props.searchQuery,
	(newQuery) => {
		localQuery.value = newQuery;
	},
);

const positionStyle = computed(() => ({
	top: `${props.position.top}px`,
	left: `${props.position.left}px`,
	transform: 'translateY(-100%)',
}));

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

onMounted(() => {
	void nextTick(() => {
		inputRef.value?.focus();
	});
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
	<Teleport to="body">
		<div data-node-mention-dropdown :class="$style.dropdown" :style="positionStyle">
			<!-- Search input -->
			<div :class="$style.searchWrapper">
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
			<div :class="$style.list">
				<div
					v-for="(node, index) in nodes"
					:key="node.id"
					:class="[$style.item, { [$style.highlighted]: index === highlightedIndex }]"
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
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.searchInput {
	width: 100%;
	height: 28px;
	padding: 0 var(--spacing--2xs);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--sm);
	background: var(--color--background);
	color: var(--color--text);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-2);
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
		background: var(--color--foreground--tint-2);
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
	color: var(--color--text--tint-2);
}
</style>
