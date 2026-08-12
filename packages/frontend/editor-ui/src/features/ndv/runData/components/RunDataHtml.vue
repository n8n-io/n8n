<script setup lang="ts">
import { computed } from 'vue';
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';
import { N8nInfoTip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

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

const { inputHtml } = defineProps<{ inputHtml: string }>();

const i18n = useI18n();

const sanitizedHtml = computed(() => sanitizeHtml(inputHtml, sanitizeOptions));

/**
 * A page that builds its own body previews as nothing, since the preview neither
 * keeps its scripts nor runs them. Saying so beats an empty box.
 */
const rendersNothing = computed(
	() => inputHtml.length > 0 && sanitizedHtml.value.replace(/<[^>]*>|\s/g, '') === '',
);
</script>

<template>
	<div :class="$style.container">
		<N8nInfoTip v-if="rendersNothing" :bold="false">
			{{ i18n.baseText('runData.htmlPreview.scriptsNotRun') }}
		</N8nInfoTip>
		<!-- Render in an isolated, script-disabled context so previewed HTML cannot
		     execute JS or reach the parent origin even if sanitization is bypassed. -->
		<iframe
			class="__html-display"
			:srcdoc="sanitizedHtml"
			sandbox=""
			referrerpolicy="no-referrer"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	height: 100%;
	overflow: hidden;
}
</style>

<style lang="scss">
.__html-display {
	flex: 1;
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
