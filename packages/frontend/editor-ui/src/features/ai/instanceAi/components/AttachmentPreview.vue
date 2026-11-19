<script lang="ts" setup>
import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
import { useAttachmentPreviews } from '@/features/ai/shared/composables/useAttachmentPreviews';
import { N8nAttachment } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import InstanceAiResourceChip from './InstanceAiResourceChip.vue';
import { elementAttachmentLabel } from '../utils/elementAttachment';
import NodesAttachmentChips from './NodesAttachmentChips.vue';

const props = defineProps<{
	file?: File;
	attachment?: InstanceAiAttachment;
	isRemovable?: boolean;
}>();
const i18n = useI18n();

const emit = defineEmits<{
	remove: [file: File];
	'remove-start': [];
	'remove-end': [];
	'remove-resource': [];
	'update:attachment': [attachment: InstanceAiNodesAttachment];
}>();

const { previewUrl } = useAttachmentPreviews(() => (props.file ? [props.file] : []));

const nodesAttachment = computed(() =>
	props.attachment?.type === 'nodes' ? props.attachment : undefined,
);
/** Resource references use chips instead of file previews. */
const workflowAttachment = computed(() =>
	props.attachment?.type === 'workflow' ? props.attachment : undefined,
);
const agentAttachment = computed(() =>
	props.attachment?.type === 'agent' ? props.attachment : undefined,
);
const elementAttachment = computed(() =>
	props.attachment?.type === 'element' ? props.attachment : undefined,
);
const elementLabel = computed(() =>
	elementAttachment.value ? elementAttachmentLabel(elementAttachment.value) : '',
);
const fileAttachment = computed(() =>
	props.attachment?.type === 'file' ? props.attachment : undefined,
);

const thumbnailSrc = computed(() => {
	const attachment = fileAttachment.value;
	return attachment?.mimeType.startsWith('image/')
		? `data:${attachment.mimeType};base64,${attachment.data}`
		: undefined;
});
</script>

<template>
	<NodesAttachmentChips
		v-if="nodesAttachment"
		:attachment="nodesAttachment"
		:is-removable="isRemovable ?? false"
		@update:attachment="emit('update:attachment', $event)"
		@remove-all="emit('remove-resource')"
	/>
	<InstanceAiResourceChip
		v-else-if="workflowAttachment"
		:label="workflowAttachment.name ?? 'Workflow'"
		icon="workflow"
		:trailing-icon="workflowAttachment.executionId ? 'play' : undefined"
		:removable="isRemovable"
		:remove-label="i18n.baseText('instanceAi.mentions.removeWorkflow')"
		test-id="attachment-preview-resource"
		remove-test-id="attachment-preview-remove-resource"
		@remove="emit('remove-resource')"
	/>
	<InstanceAiResourceChip
		v-else-if="elementAttachment"
		:label="elementLabel"
		icon="mouse-pointer"
		:removable="isRemovable"
		:remove-label="i18n.baseText('instanceAi.elementSelection.remove')"
		test-id="attachment-preview-element"
		remove-test-id="attachment-preview-remove-element"
		@remove="emit('remove-resource')"
	/>
	<InstanceAiResourceChip
		v-else-if="agentAttachment"
		:label="agentAttachment.name ?? 'Agent'"
		icon="robot"
		test-id="attachment-preview-resource"
	/>
	<N8nAttachment
		v-else-if="props.file"
		:file-name="props.file.name"
		:mime-type="props.file.type"
		:size-bytes="props.file.size"
		:src="previewUrl(props.file)"
		:is-removable="isRemovable ?? false"
		@remove-start="emit('remove-start')"
		@remove="emit('remove', props.file)"
		@remove-end="emit('remove-end')"
	/>
	<N8nAttachment
		v-else-if="fileAttachment"
		:file-name="fileAttachment.fileName"
		:mime-type="fileAttachment.mimeType"
		:src="thumbnailSrc"
		:is-removable="isRemovable ?? false"
		@remove-start="emit('remove-start')"
		@remove-end="emit('remove-end')"
	/>
</template>
