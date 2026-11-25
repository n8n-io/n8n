<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive } from 'vue';
import { N8nAttachment, N8nAttachmentGroup, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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

defineSlots<{
	/** Items before the files, in the same group. */
	default?: () => unknown;
}>();

const rootStore = useRootStore();
const i18n = useI18n();
/** Use the API URL when no panel provides a URL builder. */
const attachmentUrlBuilder = inject(AGENT_ATTACHMENT_URL_KEY, null);

/** Show an unavailable status for files whose server preview failed. */
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
		<slot />
		<template v-for="item in items" :key="item.key">
			<span
				v-if="unavailableKeys.has(item.key)"
				:class="[$style.fileChip, $style.unavailable]"
				:title="item.attachment.fileName"
				:aria-label="`${item.attachment.fileName}, ${i18n.baseText('agents.chat.attachments.unavailable')}`"
				role="img"
				data-testid="agent-chat-attachment-unavailable"
			>
				<N8nIcon icon="triangle-alert" size="small" aria-hidden="true" />
				<span :class="$style.fileName">{{ item.attachment.fileName }}</span>
				<span :class="$style.fileSize">
					{{ i18n.baseText('agents.chat.attachments.unavailable') }}
				</span>
			</span>
			<N8nAttachment
				v-else
				:file-name="item.attachment.fileName"
				:mime-type="item.attachment.mimeType"
				:size-bytes="item.attachment.sizeBytes"
				:src="item.imageSrc"
				:href="item.href"
				:download="!isImage(item.attachment) ? item.attachment.fileName : undefined"
				:is-removable="false"
				@error="item.href && unavailableKeys.add(item.key)"
			/>
		</template>
	</N8nAttachmentGroup>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.attachments {
	justify-content: inherit;

	// The slot can render nothing, and a message can have no files.
	&:empty {
		display: none;
	}
}

.fileChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 240px;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--foreground--tint-2);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.fileName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.fileSize {
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.unavailable {
	color: var(--color--text--tint-1);
	cursor: default;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}
</style>
