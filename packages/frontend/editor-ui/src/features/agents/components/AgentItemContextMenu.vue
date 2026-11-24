<script setup lang="ts">
import { N8nContextMenu, type ContextMenuNode } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { Slot } from 'reka-ui';
import { computed, ref } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{ disabled?: boolean; enabled?: boolean }>(), {
	enabled: undefined,
});
const emit = defineEmits<{ remove: []; 'update:enabled': [enabled: boolean] }>();
const i18n = useI18n();
const open = ref(false);

type Action = 'remove' | 'toggle-activation' | 'destructive';

const items = computed<Array<ContextMenuNode<Action>>>(() => {
	const actions: Array<ContextMenuNode<Action>> = [];
	if (props.enabled !== undefined) {
		actions.push({
			type: 'item',
			id: 'toggle-activation',
			label: i18n.baseText(
				props.enabled
					? 'agents.builder.contextMenu.deactivate'
					: 'agents.builder.contextMenu.activate',
			),
			icon: { type: 'icon', value: props.enabled ? 'timer' : 'play' },
			disabled: props.disabled,
		});
	}
	actions.push({
		type: 'group',
		id: 'destructive',
		children: [
			{
				type: 'item',
				id: 'remove',
				label: i18n.baseText('agents.builder.contextMenu.remove'),
				icon: { type: 'icon', value: 'trash-2' },
				variant: 'destructive',
				disabled: props.disabled,
			},
		],
	});
	return actions;
});

function select(action: Action) {
	if (props.disabled) return;
	if (action === 'remove') emit('remove');
	else if (action === 'toggle-activation' && props.enabled !== undefined)
		emit('update:enabled', !props.enabled);
}

function preventEditWhileOpen(event: MouseEvent) {
	if (!open.value) return;
	// A touch release after a long press must not open the editor.
	event.preventDefault();
	event.stopPropagation();
}
</script>

<template>
	<N8nContextMenu :items="items" :disabled="disabled" @select="select" @update:open="open = $event">
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
