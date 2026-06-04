<script setup lang="ts">
// PROTOTYPE (V3): one "Label …… value" row. The value shows the node's current
// real value (via `source`); clicking opens a popover editor. Edits are saved as
// a localStorage override (mock) and never written back to the node.
import { computed, ref, watch } from 'vue';
import { N8nInput, N8nOption, N8nPopover, N8nSelect } from '@n8n/design-system';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { GroupParamConfig } from './v3Config';
import { usePrototypeGroupParams } from './usePrototypeGroupParams';

const props = withDefaults(
	defineProps<{
		param: GroupParamConfig;
		groupId: string;
		/** Group member node name → id, so a param's `source.nodeName` can be
		 * resolved to the real node (which carries the current parameter value). */
		nodeIdByName: Record<string, string>;
		isReadOnly?: boolean;
	}>(),
	{ isReadOnly: false },
);

const workflowDocumentStore = injectWorkflowDocumentStore();
const { getOverride, setValue } = usePrototypeGroupParams();

function getByPath(obj: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, key) => {
		if (acc === null || acc === undefined) return undefined;
		if (Array.isArray(acc)) return acc[Number(key)];
		if (typeof acc === 'object') return (acc as Record<string, unknown>)[key];
		return undefined;
	}, obj);
}

// Current real value read from the mapped node parameter (if any).
const realValue = computed<string | undefined>(() => {
	const source = props.param.source;
	if (!source) return undefined;
	const nodeId = props.nodeIdByName[source.nodeName];
	if (!nodeId) return undefined;
	const node = workflowDocumentStore.value.getNodeById(nodeId);
	if (!node) return undefined;
	const resolved = getByPath(node.parameters, source.parameterPath);
	if (typeof resolved === 'string') return resolved;
	return resolved === undefined || resolved === null ? undefined : String(resolved);
});

const override = computed(() => getOverride(props.groupId, props.param.id));
const displayValue = computed(() => override.value ?? realValue.value ?? props.param.fallback);

const hint = computed(() => {
	if (props.param.type === 'select') return 'Pick an option to apply';
	if (props.param.type === 'longtext') return 'Cmd/Ctrl + Enter to save · Esc to cancel';
	return 'Enter to save · Esc to cancel';
});

const open = ref(false);
const draft = ref('');

// Commit on close: opening seeds the draft; closing saves it if it changed.
// Escape resets the draft first, so it closes without committing.
watch(open, (isOpen, wasOpen) => {
	if (isOpen) {
		draft.value = displayValue.value;
	} else if (wasOpen && draft.value !== displayValue.value) {
		setValue(props.groupId, props.param.id, draft.value);
	}
});

function onSelect(value: string) {
	draft.value = value;
	open.value = false;
}

function onCancel() {
	draft.value = displayValue.value;
	open.value = false;
}
</script>

<template>
	<div :class="$style.row" data-test-id="group-card-param">
		<span :class="$style.label">{{ param.label }}</span>
		<N8nPopover v-model:open="open" side="bottom" align="end" width="280px">
			<template #trigger>
				<button
					type="button"
					:class="[$style.value, { [$style.editable]: !isReadOnly }]"
					:title="displayValue"
					:disabled="isReadOnly"
					data-test-id="group-card-param-value"
					@mousedown.stop
					@pointerdown.stop
					@dblclick.stop
					@click.stop
				>
					{{ displayValue }}
				</button>
			</template>
			<template #content>
				<div :class="$style.editor" @mousedown.stop @click.stop>
					<span :class="$style.editorLabel">{{ param.label }}</span>
					<N8nSelect
						v-if="param.type === 'select'"
						:class="$style.control"
						:model-value="draft"
						size="small"
						data-test-id="group-card-param-select"
						@update:model-value="onSelect"
					>
						<N8nOption
							v-for="option in param.options ?? []"
							:key="option"
							:label="option"
							:value="option"
						/>
					</N8nSelect>
					<N8nInput
						v-else
						v-model="draft"
						:class="$style.control"
						:type="param.type === 'longtext' ? 'textarea' : 'text'"
						size="small"
						:autosize="param.type === 'longtext' ? { minRows: 3, maxRows: 8 } : undefined"
						data-test-id="group-card-param-input"
						@keydown.enter.exact.stop.prevent="param.type === 'text' && (open = false)"
						@keydown.enter.meta.stop.prevent="open = false"
						@keydown.enter.ctrl.stop.prevent="open = false"
						@keydown.esc.stop.prevent="onCancel"
					/>
					<span :class="$style.editorHint">{{ hint }}</span>
				</div>
			</template>
		</N8nPopover>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
	font-size: var(--font-size--sm);
}

.label {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.value {
	flex: 1;
	min-width: 0;
	text-align: right;
	border: none;
	background: transparent;
	color: var(--color--text);
	font: inherit;
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--radius);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.editable {
	cursor: pointer;
	transition: background-color 0.1s ease-in;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
}

.editorLabel {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color--text--tint-1);
}

.control {
	width: 100%;
}

.editorHint {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}
</style>
