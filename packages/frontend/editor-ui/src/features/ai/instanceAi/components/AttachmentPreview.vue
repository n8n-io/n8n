<script lang="ts" setup>
import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, ref } from 'vue';
import InstanceAiResourceChip from './InstanceAiResourceChip.vue';
import NodesAttachmentChips from './NodesAttachmentChips.vue';

const props = defineProps<{
	file?: File;
	attachment?: InstanceAiAttachment;
	isRemovable?: boolean;
}>();
const i18n = useI18n();

const emit = defineEmits<{
	remove: [file: File];
	'remove-resource': [];
	'update:attachment': [attachment: InstanceAiNodesAttachment];
}>();

const loading = ref(true);

const nodesAttachment = computed(() =>
	props.attachment?.type === 'nodes' ? props.attachment : undefined,
);
// A workflow attachment is a resource reference (no bytes) — rendered as a
// chip; everything below handles the binary file case.
const workflowAttachment = computed(() =>
	props.attachment?.type === 'workflow' ? props.attachment : undefined,
);
const agentAttachment = computed(() =>
	props.attachment?.type === 'agent' ? props.attachment : undefined,
);
const fileAttachment = computed(() =>
	props.attachment?.type === 'file' ? props.attachment : undefined,
);

const mimeType = computed(() => props.file?.type ?? fileAttachment.value?.mimeType ?? '');
const fileName = computed(() => props.file?.name ?? fileAttachment.value?.fileName ?? '');
const isImage = computed(() => mimeType.value.startsWith('image/'));

const objectUrl = computed(() => {
	if (props.file && isImage.value) {
		return URL.createObjectURL(props.file);
	}
	return null;
});

const thumbnailSrc = computed(() => {
	if (objectUrl.value) return objectUrl.value;
	if (fileAttachment.value && isImage.value) {
		return `data:${fileAttachment.value.mimeType};base64,${fileAttachment.value.data}`;
	}
	return null;
});

const fallbackFile = computed(() => {
	if (props.file) return props.file;
	if (fileAttachment.value) {
		return new File([], fileAttachment.value.fileName, { type: fileAttachment.value.mimeType });
	}
	return new File([], 'unknown');
});

function handleLoad() {
	loading.value = false;
}

function handleRemove() {
	if (props.file) {
		emit('remove', props.file);
	}
}

onBeforeUnmount(() => {
	if (objectUrl.value) {
		URL.revokeObjectURL(objectUrl.value);
	}
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
		v-else-if="agentAttachment"
		:label="agentAttachment.name ?? 'Agent'"
		icon="robot"
		test-id="attachment-preview-resource"
	/>
	<div v-else-if="isImage && thumbnailSrc" :class="$style.thumbnailWrapper">
		<div v-if="loading" :class="$style.loadingSkeleton">
			<N8nIcon icon="spinner" color="primary" spin size="small" />
		</div>
		<img :src="thumbnailSrc" :alt="fileName" :class="$style.thumbnail" @load="handleLoad" />
		<button
			v-if="isRemovable"
			:class="$style.removeBtn"
			data-test-id="attachment-preview-remove"
			@click.stop="handleRemove"
		>
			<N8nIcon icon="x" size="small" />
		</button>
	</div>
	<ChatFile
		v-else-if="props.file || fileAttachment"
		:file="fallbackFile"
		:is-removable="isRemovable ?? false"
		@remove="emit('remove', $event)"
	/>
</template>

<style lang="scss" module>
.thumbnailWrapper {
	position: relative;
	width: 80px;
	height: 80px;
	border-radius: var(--radius--lg);
	overflow: hidden;
	border: var(--border);
	flex-shrink: 0;
}

.thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.loadingSkeleton {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--foreground--tint-2);
	z-index: 1;
}

.removeBtn {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color--foreground--shade-2) 70%, transparent);
	color: white;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--3xs);
	opacity: 0;
	transition: opacity 0.15s;

	.thumbnailWrapper:hover & {
		opacity: 1;
	}

	@media (hover: none) {
		opacity: 1;
	}
}
</style>
