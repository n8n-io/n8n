<template>
	<iframe class="__html-display" :srcdoc="sanitizedHtml" />
</template>

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

<style lang="scss">
.__html-display {
	width: 100%;
	height: 100%;
}
</style>
