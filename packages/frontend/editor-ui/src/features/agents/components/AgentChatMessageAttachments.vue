<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	attachments: ChatMessageAttachment[];
	projectId: string;
	agentId: string;
}>();

const rootStore = useRootStore();

const objectUrls: string[] = [];

function downloadUrl(attachment: ChatMessageAttachment): string | undefined {
	if (!attachment.fileId) return undefined;
	const { baseUrl } = rootStore.restApiContext;
	return `${baseUrl}/projects/${props.projectId}/agents/v2/${props.agentId}/chat/attachments/${attachment.fileId}`;
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
				imageSrc = URL.createObjectURL(attachment.file);
				objectUrls.push(imageSrc);
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

function formatSize(bytes: number | undefined): string {
	if (bytes === undefined) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

onBeforeUnmount(() => {
	for (const url of objectUrls) URL.revokeObjectURL(url);
});
</script>

<template>
	<div :class="$style.attachments" data-testid="agent-chat-message-attachments">
		<template v-for="item in items" :key="item.key">
			<a
				v-if="item.imageSrc"
				:href="item.href"
				target="_blank"
				rel="noopener noreferrer"
				:class="[$style.thumbnailLink, { [$style.notClickable]: !item.href }]"
				:title="item.attachment.fileName"
				@click="!item.href && $event.preventDefault()"
			>
				<img :src="item.imageSrc" :alt="item.attachment.fileName" :class="$style.thumbnail" />
			</a>
			<component
				:is="item.href ? 'a' : 'span'"
				v-else
				:href="item.href"
				:download="item.href ? item.attachment.fileName : undefined"
				:class="$style.fileChip"
				:title="item.attachment.fileName"
			>
				<N8nIcon icon="paperclip" size="small" />
				<span :class="$style.fileName">{{ item.attachment.fileName }}</span>
				<span v-if="item.attachment.sizeBytes !== undefined" :class="$style.fileSize">
					{{ formatSize(item.attachment.sizeBytes) }}
				</span>
			</component>
		</template>
	</div>
</template>

<style lang="scss" module>
.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--4xs);
	justify-content: inherit;
}

.thumbnailLink {
	display: block;
	width: 120px;
	height: 90px;
	border-radius: var(--radius--lg);
	overflow: hidden;
	border: var(--border);
	flex-shrink: 0;
}

.notClickable {
	cursor: default;
}

.thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
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
	text-decoration: none;
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
</style>
