<script lang="ts">
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';

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

export default {
	name: 'RunDataHtml',
	props: {
		inputHtml: {
			type: String,
			required: true,
		},
	},
	computed: {
		sanitizedHtml() {
			return sanitizeHtml(this.inputHtml, sanitizeOptions);
		},
	},
};
</script>

<template>
	<!-- Render in an isolated, script-disabled context so previewed HTML cannot
	     execute JS or reach the parent origin even if sanitization is bypassed. -->
	<iframe class="__html-display" :srcdoc="sanitizedHtml" sandbox="" referrerpolicy="no-referrer" />
</template>

<style lang="scss">
.__html-display {
	width: 100%;
	height: 100%;
}
</style>
