<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { useTemplateRef } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Preview HTML from `appsStore.fetchPreview`. `null` renders the empty state. */
		html: string | null;
		/** One-time code from the same fetch; posted to the iframe once it has loaded. */
		code?: string | null;
		/** CSS width of the document; a fixed px value mimics a phone. */
		width?: string;
		loading?: boolean;
	}>(),
	{ code: null, width: '100%', loading: false },
);

const i18n = useI18n();
const iframe = useTemplateRef<HTMLIFrameElement>('iframe');

/**
 * The code travels by message, never in the HTML or a URL. The sandboxed
 * `srcdoc` document has an opaque origin, so `'*'` is the only target that
 * matches — and the message still reaches that one window only.
 */
const postCode = () => {
	if (!props.code) return;
	iframe.value?.contentWindow?.postMessage({ type: 'n8n-app-code', code: props.code }, '*');
};
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
			ref="iframe"
			:key="html ?? 'loading'"
			:srcdoc="html ?? ''"
			sandbox="allow-scripts allow-forms allow-popups"
			referrerpolicy="no-referrer"
			:title="i18n.baseText('apps.builder.preview.title')"
			:class="$style.iframe"
			:style="{ width }"
			data-test-id="app-preview-iframe"
			@load="postCode"
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
