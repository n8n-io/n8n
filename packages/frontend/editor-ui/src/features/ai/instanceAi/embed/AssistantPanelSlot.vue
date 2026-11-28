<script lang="ts" setup>
/**
 * The `assistant-panel` component slot: the embedded Assistant for a module page.
 * The module names the resource of its page. The panel keeps its own thread.
 */
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { SlotAssistantPanelProps } from '@n8n/frontend-module-sdk';

import { mcpServerThreadLaunch } from '@/features/ai/instanceAi/composables/useMcpServerAssistantHandoff';

import InstanceAiChatPanel from './InstanceAiChatPanel.vue';

const props = defineProps<SlotAssistantPanelProps>();

const emit = defineEmits<{
	close: [];
	'subject-changed': [];
}>();

const slots = defineSlots<{
	subject?: () => unknown;
	empty?: () => unknown;
}>();

const panel = useTemplateRef<InstanceType<typeof InstanceAiChatPanel>>('panel');
const threadId = ref<string>();

const launch = computed(() => mcpServerThreadLaunch(props.subject.id));

function applyPrefill() {
	if (props.prefill) panel.value?.setPrefill(props.prefill);
}

onMounted(applyPrefill);
watch(() => props.prefill, applyPrefill);
</script>

<template>
	<InstanceAiChatPanel
		ref="panel"
		v-model:thread-id="threadId"
		:subject="props.subject"
		:launch="launch"
		@subject-changed="emit('subject-changed')"
		@close="emit('close')"
	>
		<template v-if="slots.subject" #subject><slot name="subject" /></template>
		<template v-if="slots.empty" #empty><slot name="empty" /></template>
	</InstanceAiChatPanel>
</template>
