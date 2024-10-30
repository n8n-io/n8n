<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { INodeUi } from '@/Interface';

defineEmits<{
	mouseenter: [event: MouseEvent];
	mouseleave: [event: MouseEvent];
	click: [event: MouseEvent, selectedTrigger?: string];
}>();

const props = defineProps<{
	waitingForWebhook?: boolean;
	executing?: boolean;
	disabled?: boolean;
	triggerNodes: INodeUi[];
}>();

const i18n = useI18n();
const selectedTrigger = ref<string | undefined>();

const label = computed(() => {
	if (!props.executing) {
		return i18n.baseText('nodeView.runButtonText.executeWorkflow');
	}

	if (props.waitingForWebhook) {
		return i18n.baseText('nodeView.runButtonText.waitingForTriggerEvent');
	}

	return i18n.baseText('nodeView.runButtonText.executingWorkflow');
});

const actions = computed(() => {
	return props.triggerNodes.map((triggerNode) => {
		return {
			id: triggerNode.id,
			label: triggerNode.name,
			disabled: triggerNode.disabled,
		};
	});
});

const onActionSelect = (item: string) => {
	selectedTrigger.value = item;
};
</script>

<template>
	<div :class="$style.btnWrapper">
		<div :class="$style.actionWrapper">
			<KeyboardShortcutTooltip :label="label" :shortcut="{ metaKey: true, keys: ['↵'] }">
				<N8nButton
					:loading="executing"
					:label="label"
					:disabled="disabled"
					size="large"
					icon="flask"
					type="primary"
					data-test-id="execute-workflow-button"
					@mouseenter="$emit('mouseenter', $event)"
					@mouseleave="$emit('mouseleave', $event)"
					@click.stop="$emit('click', $event, selectedTrigger)"
				/>
			</KeyboardShortcutTooltip>
			<N8nActionDropdown v-if="triggerNodes.length > 1" :items="actions" @select="onActionSelect" />
		</div>
	</div>
</template>

<style module lang="scss">
.bntWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
}

.actionWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>
