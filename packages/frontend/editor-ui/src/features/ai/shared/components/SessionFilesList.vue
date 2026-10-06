<script setup lang="ts">
import type { SessionFileDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

withDefaults(
	defineProps<{
		files: SessionFileDto[];
		contentHref: (id: string) => string;
		loading?: boolean;
	}>(),
	{
		loading: false,
	},
);

const i18n = useI18n();

function isImage(file: SessionFileDto): boolean {
	return file.previewable && file.mimeType.toLowerCase().startsWith('image/');
}
</script>

<template>
	<div :class="$style.list" data-testid="session-files-list">
		<p v-if="loading" :class="$style.empty">{{ i18n.baseText('sessionFiles.title') }}</p>
		<p v-else-if="files.length === 0" :class="$style.empty">
			{{ i18n.baseText('sessionFiles.empty') }}
		</p>
		<ul v-else :class="$style.items">
			<li v-for="file in files" :key="file.id" :class="$style.item">
				<img
					v-if="isImage(file)"
					:src="contentHref(file.id)"
					:alt="file.fileName"
					:class="$style.preview"
				/>
				<a
					v-else-if="file.previewable"
					:href="contentHref(file.id)"
					target="_blank"
					rel="noopener noreferrer"
				>
					{{ file.fileName }}
				</a>
				<a v-else :href="contentHref(file.id)" :download="file.fileName">
					{{ i18n.baseText('sessionFiles.download') }} — {{ file.fileName }}
				</a>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}

.empty {
	margin: 0;
	color: var(--color--text--light);
	font-size: var(--font-size--sm);
}

.items {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	font-size: var(--font-size--sm);
	min-width: 0;
	overflow-wrap: anywhere;
}

.preview {
	display: block;
	max-width: 100%;
	max-height: 120px;
	object-fit: contain;
}
</style>
