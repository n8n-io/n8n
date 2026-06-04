<script setup lang="ts">
// PROTOTYPE: card body for a trigger node when the V2 variant is active. Icon on
// the left, editable title + description on the right (formatted like the group
// cards). Edits persist to a localStorage override (usePrototypeNodeCard) and do
// not touch the real node.
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nInlineTextEdit, N8nInput } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { NodeIconSource } from '@/app/utils/nodeIcon';
import { usePrototypeNodeCard } from './usePrototypeNodeCard';

const props = withDefaults(
	defineProps<{
		nodeId: string;
		nodeName: string;
		iconSource: NodeIconSource | undefined;
		isReadOnly?: boolean;
	}>(),
	{ isReadOnly: false },
);

const i18n = useI18n();

const { title, description, setTitle, setDescription } = usePrototypeNodeCard(
	() => props.nodeId,
	() => props.nodeName,
);

const hasDescription = computed(() => description.value.length > 0);

function onTitleUpdate(value: string) {
	setTitle(value);
}

// Inline-edit for the description: the display swaps to a textarea on click;
// blur commits, Escape cancels, Cmd/Ctrl+Enter commits (mirrors the group
// overlay).
const descriptionInput = useTemplateRef<InstanceType<typeof N8nInput>>('descriptionInput');
const isEditingDescription = ref(false);
const descriptionDraft = ref('');

function startEditDescription() {
	if (props.isReadOnly) return;
	descriptionDraft.value = description.value;
	isEditingDescription.value = true;
	void nextTick(() => descriptionInput.value?.focus());
}

function commitDescription() {
	if (!isEditingDescription.value) return;
	isEditingDescription.value = false;
	const next = descriptionDraft.value.trim();
	if (next !== description.value) {
		setDescription(next);
	}
}

function cancelDescription() {
	isEditingDescription.value = false;
}
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.iconWrapper">
			<NodeIcon :icon-source="iconSource" :size="24" :shrink="false" />
		</div>
		<div :class="$style.textBlock">
			<div :class="$style.title" data-test-id="trigger-card-title">
				<N8nInlineTextEdit
					:model-value="title"
					:read-only="isReadOnly"
					:min-width="0"
					max-width="100%"
					@update:model-value="onTitleUpdate"
					@mousedown.stop
				/>
			</div>
			<N8nInput
				v-if="isEditingDescription"
				ref="descriptionInput"
				v-model="descriptionDraft"
				type="textarea"
				size="small"
				:autosize="{ minRows: 2, maxRows: 6 }"
				:class="$style.descriptionInput"
				data-test-id="trigger-card-description-input"
				@blur="commitDescription"
				@keydown.esc.stop.prevent="cancelDescription"
				@keydown.enter.meta.stop.prevent="commitDescription"
				@keydown.enter.ctrl.stop.prevent="commitDescription"
				@mousedown.stop
				@click.stop
			/>
			<div
				v-else-if="hasDescription || !isReadOnly"
				:class="[
					$style.description,
					{
						[$style.descriptionEditable]: !isReadOnly,
						[$style.descriptionPlaceholder]: !hasDescription,
					},
				]"
				data-test-id="trigger-card-description"
				@click.stop="startEditDescription"
				@mousedown.stop
			>
				{{
					hasDescription ? description : i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')
				}}
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
	box-sizing: border-box;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.textBlock {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	min-width: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.description {
	min-width: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.descriptionEditable {
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-left: calc(var(--spacing--3xs) * -1);
	border-radius: var(--radius);
	transition: background-color 0.1s ease-in;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.descriptionPlaceholder {
	font-style: italic;
	color: var(--color--text--tint-2);
}

.descriptionInput {
	width: 100%;
}
</style>
