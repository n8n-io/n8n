<template>
	<iframe class="__html-display" :srcdoc="sanitizedHtml" />
</template>

<script lang="ts">
import type { PropType } from 'vue';
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
			type: String as PropType<string>,
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
