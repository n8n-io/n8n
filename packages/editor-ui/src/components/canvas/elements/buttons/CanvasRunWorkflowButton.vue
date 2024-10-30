<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { INodeUi } from '@/Interface';
import { N8nActionDropdown } from 'n8n-design-system';

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
	selectedTrigger.value = actions.value.find((x) => x.id === item)?.label;
};
</script>

<template>
	<div :class="$style.btnWrapper">
		<div :class="$style.actionWrapper">
			<KeyboardShortcutTooltip :label="label" :shortcut="{ metaKey: true, keys: ['↵'] }">
				<N8nButton
					:class="{
						[$style.firstButton]: triggerNodes.length > 1,
					}"
					:loading="executing"
					:disabled="disabled"
					size="large"
					icon="flask"
					type="primary"
					data-test-id="execute-workflow-button"
					@mouseenter="$emit('mouseenter', $event)"
					@mouseleave="$emit('mouseleave', $event)"
					@click.stop="$emit('click', $event, selectedTrigger)"
					>{{
						label + (selectedTrigger && triggerNodes.length > 1 ? ` from "${selectedTrigger}"` : '')
					}}</N8nButton
				>
			</KeyboardShortcutTooltip>
			<div :class="$style.line"></div>
			<N8nActionDropdown v-if="triggerNodes.length > 1" :items="actions" @select="onActionSelect">
				<template #activator>
					<N8nIconButton :class="$style.lastButton" size="large" icon="chevron-down" />
				</template>
			</N8nActionDropdown>
		</div>
	</div>
</template>

<style module lang="scss">
.bntWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
}

.firstButton {
	border-right: none;
	border-radius: 4px 0 0 4px; // hardcoded
}

.lastButton {
	border-left: none;
	border-radius: 0 4px 4px 0; // hardcoded
}

.line {
	background-color: var(--color-background-light);
	height: 42px; // hardcoded for now
	width: 1px;
}

.actionWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>
