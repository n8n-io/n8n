<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive } from 'vue';
import { N8nAttachment, N8nAttachmentGroup } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';
import { getChatAttachmentUrl } from '../composables/useAgentApi';
import { AGENT_ATTACHMENT_URL_KEY } from './agentChatInjectionKeys';

const props = defineProps<{
	attachments: ChatMessageAttachment[];
	projectId: string;
	agentId: string;
	/** Session that shows the files. A sub-agent session needs it to read its granted files. */
	threadId?: string;
}>();

const rootStore = useRootStore();
/** Use the API URL when no panel provides a URL builder. */
const attachmentUrlBuilder = inject(AGENT_ATTACHMENT_URL_KEY, null);

/** Disable links to files whose server preview failed. */
const unavailableKeys = reactive(new Set<string>());

/** Reuse each local preview URL until the component unmounts. */
const objectUrlsByFile = new Map<File, string>();

function objectUrlFor(file: File): string {
	let url = objectUrlsByFile.get(file);
	if (!url) {
		url = URL.createObjectURL(file);
		objectUrlsByFile.set(file, url);
	}
	return url;
}

function downloadUrl(attachment: ChatMessageAttachment): string | undefined {
	if (!attachment.fileId) return undefined;
	if (attachmentUrlBuilder) return attachmentUrlBuilder(attachment.fileId);
	return getChatAttachmentUrl(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
		attachment.fileId,
		'chat',
		props.threadId,
	);
}

function isImage(attachment: ChatMessageAttachment): boolean {
	return attachment.mimeType.startsWith('image/');
}

interface RenderAttachment {
	key: string;
	attachment: ChatMessageAttachment;
	imageSrc?: string;
	href?: string;
}

const items = computed<RenderAttachment[]>(() =>
	props.attachments.map((attachment, index) => {
		const href = downloadUrl(attachment);
		let imageSrc: string | undefined;
		if (isImage(attachment)) {
			if (href) {
				imageSrc = href;
			} else if (attachment.file) {
				imageSrc = objectUrlFor(attachment.file);
			}
		}
		return {
			key: attachment.fileId ?? `local-${index}`,
			attachment,
			imageSrc,
			href,
		};
	}),
);

onBeforeUnmount(() => {
	for (const url of objectUrlsByFile.values()) URL.revokeObjectURL(url);
	objectUrlsByFile.clear();
});
</script>

<template>
	<N8nAttachmentGroup :class="$style.attachments" data-testid="agent-chat-message-attachments">
		<N8nAttachment
			v-for="item in items"
			:key="item.key"
			:file-name="item.attachment.fileName"
			:mime-type="item.attachment.mimeType"
			:size-bytes="item.attachment.sizeBytes"
			:src="item.imageSrc"
			:href="unavailableKeys.has(item.key) ? undefined : item.href"
			:download="!isImage(item.attachment) ? item.attachment.fileName : undefined"
			:is-removable="false"
			@error="item.href && unavailableKeys.add(item.key)"
		/>
	</N8nAttachmentGroup>
</template>

<style lang="scss" module>
.attachments {
	justify-content: inherit;
}

</style>
