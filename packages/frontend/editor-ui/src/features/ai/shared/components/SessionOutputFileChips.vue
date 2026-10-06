<script setup lang="ts">
import type { SessionFileDto } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { formatBytes } from '@n8n/utils/number/bytes';

defineProps<{
	files: SessionFileDto[];
	contentHref: (id: string) => string;
}>();

const i18n = useI18n();

function isImage(file: SessionFileDto): boolean {
	return file.previewable && file.mimeType.toLowerCase().startsWith('image/');
}
</script>

<template>
	<div :class="$style.chips" data-testid="session-output-file-chips">
		<template v-for="file in files" :key="file.id">
			<a
				v-if="isImage(file)"
				:href="contentHref(file.id)"
				target="_blank"
				rel="noopener noreferrer"
				:class="$style.thumbnailLink"
				:title="file.fileName"
				data-testid="session-output-file-chip"
			>
				<img :src="contentHref(file.id)" :alt="file.fileName" :class="$style.thumbnail" />
			</a>
			<a
				v-else-if="file.previewable"
				:href="contentHref(file.id)"
				target="_blank"
				rel="noopener noreferrer"
				:class="$style.fileChip"
				:title="file.fileName"
				data-testid="session-output-file-chip"
			>
				<N8nIcon icon="file" size="small" />
				<span :class="$style.fileName">{{ file.fileName }}</span>
				<span :class="$style.fileSize">{{ formatBytes(file.sizeBytes) }}</span>
			</a>
			<a
				v-else
				:href="contentHref(file.id)"
				:download="file.fileName"
				:class="$style.fileChip"
				:title="file.fileName"
				data-testid="session-output-file-chip"
			>
				<N8nIcon icon="download" size="small" />
				<span :class="$style.fileName">
					{{ i18n.baseText('sessionFiles.download') }} — {{ file.fileName }}
				</span>
				<span :class="$style.fileSize">{{ formatBytes(file.sizeBytes) }}</span>
			</a>
		</template>
	</div>
</template>

<style lang="scss" module>
.chips {
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
