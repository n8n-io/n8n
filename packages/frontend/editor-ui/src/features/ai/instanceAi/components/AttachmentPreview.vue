<script lang="ts" setup>
import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
import { useAttachmentPreviews } from '@/features/ai/shared/composables/useAttachmentPreviews';
import { N8nAttachment, type IconName } from '@n8n/design-system';
import { computed } from 'vue';
import { elementAttachmentLabel } from '../utils/elementAttachment';
import NodesAttachmentChips from './NodesAttachmentChips.vue';

const props = defineProps<{
	file?: File;
	attachment?: InstanceAiAttachment;
	isRemovable?: boolean;
}>();

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
/** Workflows, agents and page elements show as attachments, with an icon in place of a preview. */
const resourceCard = computed((): { name: string; icon: IconName; testId: string } | undefined => {
	const attachment = props.attachment;
	switch (attachment?.type) {
		case 'workflow':
			return {
				name: attachment.name ?? 'Workflow',
				icon: 'workflow',
				testId: 'attachment-preview-resource',
			};
		case 'agent':
			return {
				name: attachment.name ?? 'Agent',
				icon: 'robot',
				testId: 'attachment-preview-resource',
			};
		case 'element':
			return {
				name: elementAttachmentLabel(attachment),
				icon: 'mouse-pointer',
				testId: 'attachment-preview-element',
			};
		default:
			return undefined;
	}
});
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
	<N8nAttachment
		v-else-if="resourceCard"
		:file-name="resourceCard.name"
		:icon="resourceCard.icon"
		:is-removable="isRemovable ?? false"
		:data-test-id="resourceCard.testId"
		@remove="emit('remove-resource')"
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
