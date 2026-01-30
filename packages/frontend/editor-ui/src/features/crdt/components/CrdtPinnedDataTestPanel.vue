<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { INodeExecutionData } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import { useCrdtPinnedData } from '../composables/useCrdtPinnedData';

const selectedNodeId = defineModel<string | null>({
	type: String,
	default: null,
});

const doc = useWorkflowDoc();

// Build node ref for useCrdtPinnedData
const selectedNode = computed<INodeUi | null>(() => {
	if (!selectedNodeId.value) return null;
	const node = doc.findNode(selectedNodeId.value);
	return node ? ({ id: node.id, name: node.name } as INodeUi) : null;
});

const { data, hasData, setData, unsetData } = useCrdtPinnedData(doc, selectedNode);

const itemCount = computed(() => data.value?.length ?? 0);

// Counter for generating unique mock data
const mockCounter = ref(1);

function addMockData() {
	const newItem: INodeExecutionData = {
		json: {
			id: mockCounter.value++,
			message: 'Test pinned data',
			timestamp: new Date().toISOString(),
		},
	};

	// Append to existing data or create new array
	const existing = data.value ?? [];
	setData([...existing, newItem]);
}

function clearData() {
	unsetData();
}

// Subscribe to remote changes for visual feedback
let unsubHandle: { off: () => void } | undefined;
const lastChangeTime = ref<string | null>(null);

onMounted(() => {
	if (doc.onPinnedDataChange) {
		unsubHandle = doc.onPinnedDataChange((change) => {
			if (change.nodeId === selectedNodeId.value) {
				lastChangeTime.value = new Date().toLocaleTimeString();
			}
		});
	}
});

onUnmounted(() => unsubHandle?.off());
</script>

<template>
	<div v-if="selectedNodeId" :class="$style.panel">
		<div :class="$style.header">
			<h3 :class="$style.title">Pinned Data</h3>
			<span v-if="hasData" :class="$style.badge"
				>{{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }}</span
			>
		</div>

		<div v-if="hasData" :class="$style.content">
			<pre :class="$style.json">{{ JSON.stringify(data, null, 2) }}</pre>
		</div>
		<p v-else :class="$style.empty">No pinned data for this node</p>

		<div :class="$style.actions">
			<button :class="$style.button" @click="addMockData">Add Mock Item</button>
			<button v-if="hasData" :class="[$style.button, $style.danger]" @click="clearData">
				Clear All
			</button>
		</div>

		<div v-if="lastChangeTime" :class="$style.hint">Last sync: {{ lastChangeTime }}</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	bottom: var(--spacing--sm);
	right: var(--spacing--sm);
	width: 320px;
	max-height: 400px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	z-index: 100;
	padding: var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	font-size: var(--font-size--2xs);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
	padding-bottom: var(--spacing--2xs);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.title {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--primary--tint-2);
	color: var(--color--primary);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

.content {
	flex: 1;
	overflow-y: auto;
	margin-bottom: var(--spacing--xs);
	padding: var(--spacing--2xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	max-height: 200px;
}

.json {
	margin: 0;
	font-size: var(--font-size--3xs);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-word;
}

.empty {
	margin: var(--spacing--sm) 0;
	color: var(--color--text--tint-2);
	font-style: italic;
	text-align: center;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.button {
	flex: 1;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	background: var(--color--background);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	transition: background-color 0.15s;

	&:hover {
		background: var(--color--foreground--tint-1);
	}

	&:active {
		background: var(--color--foreground--tint-2);
	}
}

.danger {
	color: var(--color--danger);
	border-color: var(--color--danger--tint-3);

	&:hover {
		background: var(--color--danger--tint-4);
	}
}

.hint {
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-1);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--3xs);
	text-align: center;
}
</style>
