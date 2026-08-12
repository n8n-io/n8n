<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { HTML_PREVIEW_MODAL_KEY } from '@/app/constants';

const { html, title = '' } = defineProps<{ html: string; title?: string }>();

const i18n = useI18n();
const uiStore = useUIStore();

const size = computed(() => {
	const bytes = new Blob([html]).size;
	return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} kB`;
});

function open() {
	uiStore.openModalWithData({ name: HTML_PREVIEW_MODAL_KEY, data: { html, title } });
}
</script>

<template>
	<button :class="$style.chip" data-test-id="html-preview-button" @click.stop="open">
		<N8nIcon icon="file-code" size="small" />
		<span>{{ i18n.baseText('runData.htmlPreview.open') }}</span>
		<span :class="$style.size">{{ size }}</span>
	</button>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	padding: 0 var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--3xs);
	line-height: 1.6;
	cursor: pointer;

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
	}
}

.size {
	color: var(--color--text--shade-2);
}
</style>
