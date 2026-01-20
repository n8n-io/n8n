<script lang="ts" setup>
import { ref, watch, onUnmounted, h, defineComponent, shallowRef } from 'vue';
import { toJSON, getNestedValue } from '@n8n/crdt';
import type { CRDTMap, Unsubscribe } from '@n8n/crdt';
import { useWorkflowDoc } from '../composables/useWorkflowSync';

const selectedNodeId = defineModel<string | null>({
	type: String,
	default: null,
});

const doc = useWorkflowDoc();

// Top-level keys only - for structure, not values
const topLevelKeys = shallowRef<string[]>([]);
// Reference to parameters map for child components
const parametersMapRef = shallowRef<CRDTMap<unknown> | null>(null);

let unsubscribeStructure: Unsubscribe | null = null;

function refreshTopLevelKeys() {
	if (!parametersMapRef.value) {
		topLevelKeys.value = [];
		return;
	}
	const keys: string[] = [];
	for (const [key] of parametersMapRef.value.entries()) {
		keys.push(key);
	}
	topLevelKeys.value = keys;
}

function subscribeToNode(nodeId: string) {
	unsubscribeStructure?.();
	unsubscribeStructure = null;
	parametersMapRef.value = null;
	topLevelKeys.value = [];

	if (!nodeId) return;

	const parametersMap = doc.getNodeParametersMap?.(nodeId);
	if (!parametersMap) return;

	parametersMapRef.value = parametersMap;
	refreshTopLevelKeys();

	// Only subscribe to structural changes (keys added/removed)
	if ('onDeepChange' in parametersMap) {
		unsubscribeStructure = parametersMap.onDeepChange((changes) => {
			// Check if any change is a top-level add/delete
			const hasStructuralChange = changes.some(
				(c) => c.path.length === 1 && (c.action === 'add' || c.action === 'delete'),
			);
			if (hasStructuralChange) {
				refreshTopLevelKeys();
			}
		});
	}
}

watch(selectedNodeId, (nodeId) => {
	if (nodeId) subscribeToNode(nodeId);
	else {
		parametersMapRef.value = null;
		topLevelKeys.value = [];
	}
});

onUnmounted(() => unsubscribeStructure?.());

function updateAtPath(path: string[], value: unknown) {
	if (!selectedNodeId.value) return;
	doc.updateNodeParamAtPath?.(selectedNodeId.value, path, value);
}

// Leaf component - subscribes to its own value only
const ParamLeaf = defineComponent({
	name: 'ParamLeaf',
	props: {
		parametersMap: { type: Object as () => CRDTMap<unknown>, required: true },
		path: { type: Array as () => string[], required: true },
		initialValue: { type: [String, Number, Boolean], default: null },
	},
	setup(props) {
		const localValue = ref(props.initialValue);
		let unsubscribe: Unsubscribe | null = null;

		const updateFromCRDT = () => {
			const val = getNestedValue(props.parametersMap, props.path) as
				| string
				| number
				| boolean
				| null;
			localValue.value = val;
		};

		// Subscribe to changes at this specific path
		if ('onDeepChange' in props.parametersMap) {
			unsubscribe = props.parametersMap.onDeepChange((changes) => {
				const pathStr = props.path.join('.');
				const relevant = changes.some((c) => {
					const changePath = c.path.join('.');
					return changePath === pathStr || changePath.startsWith(pathStr + '.');
				});
				if (relevant) {
					updateFromCRDT();
				}
			});
		}

		// Cleanup subscription on unmount
		onUnmounted(() => unsubscribe?.());

		const onInput = (e: Event) => {
			const target = e.target as HTMLInputElement;
			let newValue: unknown = target.value;

			if (typeof localValue.value === 'number') {
				newValue = parseFloat(target.value) || 0;
			} else if (typeof localValue.value === 'boolean') {
				newValue = target.checked;
			}

			updateAtPath(props.path, newValue);
		};

		return () => {
			const value = localValue.value;

			if (value === null || value === undefined) {
				return h('input', {
					class: 'param-input',
					value: '',
					placeholder: 'null',
					onInput,
				});
			}

			if (typeof value === 'boolean') {
				return h('input', {
					type: 'checkbox',
					class: 'param-checkbox',
					checked: value,
					onInput,
				});
			}

			return h('input', {
				class: 'param-input',
				type: typeof value === 'number' ? 'number' : 'text',
				value: String(value),
				onInput,
			});
		};
	},
});

// Recursive structure component - renders containers, delegates leaves
const ParamValue = defineComponent({
	name: 'ParamValue',
	props: {
		parametersMap: { type: Object as () => CRDTMap<unknown>, required: true },
		path: { type: Array as () => string[], required: true },
		depth: { type: Number, default: 0 },
	},
	setup(props) {
		return () => {
			const rawValue = getNestedValue(props.parametersMap, props.path);
			const value = toJSON(rawValue) as
				| Record<string, unknown>
				| unknown[]
				| string
				| number
				| boolean
				| null;
			const { path, depth } = props;

			// Primitives - delegate to leaf component
			if (value === null || value === undefined || typeof value !== 'object') {
				return h(ParamLeaf, {
					parametersMap: props.parametersMap,
					path,
					initialValue: value,
					key: path.join('.'),
				});
			}

			// Array
			if (Array.isArray(value)) {
				return h('div', { class: 'param-array' }, [
					...value.map((_item, index) =>
						h('div', { class: 'param-array-item', key: index }, [
							h('span', { class: 'param-index' }, `[${index}]`),
							h(ParamValue, {
								parametersMap: props.parametersMap,
								path: [...path, String(index)],
								depth: depth + 1,
							}),
						]),
					),
				]);
			}

			// Object
			const entries = Object.entries(value);
			return h(
				'div',
				{ class: 'param-object' },
				entries.map(([key]) =>
					h('div', { class: 'param-field', key }, [
						h('label', { class: 'param-key' }, key),
						h(ParamValue, {
							parametersMap: props.parametersMap,
							path: [...path, key],
							depth: depth + 1,
						}),
					]),
				),
			);
		};
	},
});
</script>

<template>
	<div v-if="selectedNodeId" :class="$style.panel">
		<!-- Key on selectedNodeId to force full recreation when switching nodes -->
		<div v-if="parametersMapRef" :key="selectedNodeId" :class="$style.params">
			<div v-if="topLevelKeys.length === 0" :class="$style.empty">
				No parameters configured for this node.
			</div>
			<template v-else>
				<div v-for="key in topLevelKeys" :key="key" class="param-field">
					<label class="param-key">{{ key }}</label>
					<ParamValue :parameters-map="parametersMapRef" :path="[key]" :depth="1" />
				</div>
			</template>
		</div>

		<div :class="$style.hint">Type in any field - syncs via CRDT path updates</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	width: 280px;
	max-height: calc(100vh - 100px);
	overflow-y: auto;
	z-index: 100;
	padding: var(--spacing--xs);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	font-size: 11px;
}

.params {
	:global(.param-object) {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	:global(.param-field) {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	:global(.param-key) {
		font-size: 10px;
		font-weight: 600;
		color: var(--color--text--tint-1);
	}

	:global(.param-input) {
		width: 100%;
		padding: 3px 6px;
		font-size: 11px;
		border: 1px solid var(--color--foreground);
		border-radius: var(--radius--sm);
		background: var(--color--background);
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: var(--color--primary);
		}
	}

	:global(.param-checkbox) {
		width: 14px;
		height: 14px;
	}

	:global(.param-array) {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-left: 8px;
		padding-left: 8px;
		border-left: 2px solid var(--color--foreground--tint-1);
	}

	:global(.param-array-item) {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	:global(.param-index) {
		font-size: 9px;
		font-weight: 600;
		color: var(--color--text--tint-2);
	}

	:global(.param-object .param-object),
	:global(.param-array .param-object) {
		margin-left: 8px;
		padding-left: 8px;
		border-left: 2px solid var(--color--foreground--tint-1);
	}
}

.empty {
	color: var(--color--text--tint-2);
	font-style: italic;
	padding: var(--spacing--2xs);
}

.hint {
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-1);
	color: var(--color--text--tint-2);
	font-size: 9px;
}
</style>
