<script lang="ts">
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';

const sanitizeOptions: SanitizeOptions = {
	allowVulnerableTags: false, // ✅ SECURITY FIX: Remove vulnerable tags
	enforceHtmlBoundary: false,
	disallowedTagsMode: 'discard',
	allowedTags: [...defaults.allowedTags, 'img', 'title'], // ✅ Remove 'style' tag
	allowedAttributes: {
		...defaults.allowedAttributes,
		'*': ['class', 'style'], // Keep inline styles for safe styling
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
	<iframe class="__html-display" :srcdoc="sanitizedHtml" />
</template>

<style lang="scss">
.__html-display {
	width: 100%;
	height: 100%;
}
</style>
