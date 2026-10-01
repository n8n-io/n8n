<script setup lang="ts">
import { N8nContextMenu, type ContextMenuNode } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { Slot } from 'reka-ui';
import { computed, ref } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ remove: [] }>();
const i18n = useI18n();
const open = ref(false);

const items = computed<Array<ContextMenuNode<'remove'>>>(() => [
	{
		type: 'item',
		id: 'remove',
		label: i18n.baseText('agents.builder.contextMenu.remove'),
		icon: { type: 'icon', value: 'trash-2' },
		variant: 'destructive',
		disabled: props.disabled,
	},
]);

function remove() {
	if (props.disabled) return;
	emit('remove');
}

function preventEditWhileOpen(event: MouseEvent) {
	if (!open.value) return;
	// A touch release after a long press must not open the editor.
	event.preventDefault();
	event.stopPropagation();
}
</script>

<template>
	<N8nContextMenu :items="items" :disabled="disabled" @select="remove" @update:open="open = $event">
		<template #trigger>
			<Slot v-bind="$attrs" :class="$style.trigger" @click.capture="preventEditWhileOpen">
				<slot />
			</Slot>
		</template>
	</N8nContextMenu>
</template>

<style module>
.trigger {
	user-select: none;
}
</style>
