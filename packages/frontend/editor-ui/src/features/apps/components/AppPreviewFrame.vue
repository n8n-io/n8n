<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

withDefaults(
	defineProps<{
		/** Preview HTML from `appsStore.fetchPreview`. `null` renders the empty state. */
		html: string | null;
		/** CSS width of the document; a fixed px value mimics a phone. */
		width?: string;
		loading?: boolean;
	}>(),
	{ width: '100%', loading: false },
);

const i18n = useI18n();
</script>

<template>
	<div :class="$style.frame" data-test-id="app-preview-frame">
		<N8nText v-if="html === null && !loading" color="text-light" data-test-id="app-preview-empty">
			{{ i18n.baseText('apps.builder.preview.empty') }}
		</N8nText>
		<!--
			Sandboxed with no `allow-same-origin`: the preview HTML contains author
			code, and `srcdoc` (never a REST URL navigation, which can't send the
			`browser-id` header the auth middleware requires) keeps it from ever
			holding this editor's session.
		-->
		<iframe
			v-else
			:key="html ?? 'loading'"
			:srcdoc="html ?? ''"
			sandbox="allow-scripts allow-forms allow-popups"
			referrerpolicy="no-referrer"
			:title="i18n.baseText('apps.builder.preview.title')"
			:class="$style.iframe"
			:style="{ width }"
			data-test-id="app-preview-iframe"
		/>
	</div>
</template>

<style lang="scss" module>
.frame {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 0;
	background: var(--background--subtle);
}

.iframe {
	height: 100%;
	max-width: 100%;
	border: 0;
	background: var(--background--surface);
}
</style>
