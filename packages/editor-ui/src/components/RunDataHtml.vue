<template>
	<iframe class="__html-display ph-no-capture" :srcdoc="html" />
</template>

<script lang="ts">
import type { PropType } from 'vue';
import sanitizeHtml, { defaults, type IOptions as SanitizeOptions } from 'sanitize-html';
import type { INodeExecutionData } from 'n8n-workflow';

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
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
		},
	},
	computed: {
		html() {
			const markup = (this.inputData?.[0].json.html as string) ?? '';
			return sanitizeHtml(markup, sanitizeOptions);
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
