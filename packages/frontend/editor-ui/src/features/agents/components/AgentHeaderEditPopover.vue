<script setup lang="ts">
/**
 * Small floating editor for the agent's name + icon. Triggered by the pen
 * icon in AgentBuilderHeader. Parent controls visibility via `v-if` and
 * listens for `save` / `cancel`.
 */
import { ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { N8nButton, N8nIconPicker, N8nInput, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

const props = defineProps<{ name: string; icon: IconOrEmoji }>();
const emit = defineEmits<{
	save: [payload: { name: string; icon: IconOrEmoji }];
	cancel: [];
}>();

const localName = ref(props.name);
const localIcon = ref<IconOrEmoji>(props.icon);
const root = ref<HTMLDivElement | null>(null);

watch(
	() => props.name,
	(v) => (localName.value = v),
);
watch(
	() => props.icon,
	(v) => (localIcon.value = v),
);

onClickOutside(root, () => emit('cancel'));

function onSave() {
	const trimmed = localName.value.trim();
	if (!trimmed) return;
	emit('save', { name: trimmed, icon: localIcon.value });
}
</script>

<template>
	<div ref="root" :class="$style.popover" data-testid="agent-header-edit-popover">
		<N8nText size="small" :bold="true">Agent</N8nText>
		<div :class="$style.row">
			<N8nIconPicker v-model="localIcon" button-tooltip="Change icon" button-size="small" />
			<N8nInput
				v-model="localName"
				placeholder="Agent name"
				data-testid="agent-header-edit-name"
				@keydown.enter="onSave"
				@keydown.esc="emit('cancel')"
			/>
		</div>
		<div :class="$style.actions">
			<N8nButton type="tertiary" size="small" @click="emit('cancel')">Cancel</N8nButton>
			<N8nButton type="primary" size="small" :disabled="!localName.trim()" @click="onSave">
				Save
			</N8nButton>
		</div>
	</div>
</template>

<style module>
.popover {
	position: absolute;
	top: calc(100% + var(--spacing--4xs));
	left: 0;
	z-index: 20;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	min-width: 320px;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
