<script lang="ts" setup>
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';
import { computed } from 'vue';

interface HtmlPreviewProps {
	/** Untrusted HTML to show. The component sanitizes it before it renders it. */
	html: string;
}

const sanitizeOptions: SanitizeOptions = {
	allowVulnerableTags: false,
	enforceHtmlBoundary: false,
	disallowedTagsMode: 'discard',
	allowedTags: [...defaults.allowedTags, 'style', 'img', 'title'],
	allowedAttributes: {
		...defaults.allowedAttributes,
		'*': ['class', 'style'],
	},
	transformTags: {
		head: '',
	},
};

defineOptions({ name: 'N8nHtmlPreview' });
const props = defineProps<HtmlPreviewProps>();

const sanitizedHtml = computed(() => sanitizeHtml(props.html, sanitizeOptions));
</script>

<template>
	<!-- Render in an isolated, script-disabled context so previewed HTML cannot
	     execute JS or reach the parent origin even if sanitization is bypassed. -->
	<!-- Callers and end-to-end tests select the iframe by the `__html-display` class -->
	<iframe class="__html-display" :srcdoc="sanitizedHtml" sandbox="" referrerpolicy="no-referrer" />
</template>

<style lang="scss">
.__html-display {
	width: 100%;
	height: 100%;
}
</style>
