<script setup lang="ts">
/**
 * CRDT Resolved Expression Display
 *
 * Displays pre-computed resolved expression values from the CRDT execution document.
 * This component is read-only - all expression resolution happens in the coordinator worker.
 *
 * The UI should NEVER resolve expressions itself - it should only read pre-computed
 * values from CRDT. This ensures:
 * 1. Consistent values across tabs (CRDT-synced)
 * 2. No duplicate resolution work
 * 3. No missing dependencies (coordinator has full Workflow context)
 */
import { computed, inject, ref, watch, onUnmounted } from 'vue';
import type { ExecutionDocument, ResolvedValue } from '../types/executionDocument.types';
import { formatValue } from '../utils/formatting';

const props = defineProps<{
	nodeId: string;
}>();

const executionDoc = inject<ExecutionDocument>('executionDoc');

// Reactive map of resolved params
const resolvedParams = ref<Map<string, ResolvedValue>>(new Map());

// Load initial + watch for changes
watch(
	() => props.nodeId,
	(nodeId) => {
		if (!executionDoc || !nodeId) {
			resolvedParams.value = new Map();
			return;
		}
		resolvedParams.value = executionDoc.getAllResolvedParams(nodeId);
	},
	{ immediate: true },
);

// Subscribe to changes from CRDT
const subscription = executionDoc?.onResolvedParamChange(({ nodeId, paramPath }) => {
	if (nodeId === props.nodeId && executionDoc) {
		const value = executionDoc.getResolvedParam(nodeId, paramPath);
		if (value) {
			resolvedParams.value.set(paramPath, value);
		} else {
			resolvedParams.value.delete(paramPath);
		}
		// Trigger reactivity
		resolvedParams.value = new Map(resolvedParams.value);
	}
});

onUnmounted(() => subscription?.off());

const sortedParams = computed(() =>
	Array.from(resolvedParams.value.entries()).sort(([a], [b]) => a.localeCompare(b)),
);

/**
 * Get a display-friendly path by stripping the "parameters." prefix.
 */
function formatPath(path: string): string {
	return path.replace(/^parameters\./, '');
}
</script>

<template>
	<div v-if="sortedParams.length > 0" :class="$style.container">
		<div :class="$style.header">Resolved Expressions</div>
		<div v-for="[path, resolved] in sortedParams" :key="path" :class="$style.item">
			<div :class="$style.path">{{ formatPath(path) }}</div>
			<div :class="[$style.value, $style[resolved.state]]">
				<template v-if="resolved.state === 'valid'">
					{{ formatValue(resolved.resolved) }}
				</template>
				<template v-else-if="resolved.state === 'pending'"> Waiting for execution data </template>
				<template v-else>
					{{ resolved.error }}
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xs);
	border-top: 1px solid var(--color--foreground);
	max-height: 200px;
	overflow-y: auto;
}

.header {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	margin-bottom: var(--spacing--2xs);
	color: var(--color--text--tint-1);
}

.item {
	display: flex;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.path {
	color: var(--color--text--tint-1);
	min-width: 120px;
	flex-shrink: 0;
	word-break: break-all;
}

.value {
	flex: 1;
	word-break: break-all;
	white-space: pre-wrap;
}

.valid {
	color: var(--color--success);
}

.pending {
	color: var(--color--warning);
	font-style: italic;
}

.invalid {
	color: var(--color--danger);
}
</style>
