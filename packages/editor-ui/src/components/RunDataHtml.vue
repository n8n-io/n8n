<template>
	<div class="htmlDisplay" v-html="html"></div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import type { INodeExecutionData } from 'n8n-workflow';

export default {
	name: 'RunDataHtml',
	props: {
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
		},
	},
	computed: {
		html() {
			if (!this.inputData) return '';

			return this.inputData[0].json.html; // @TODO: Sanitize?
		},
	},
};
</script>

<style lang="scss" scoped>
.htmlDisplay {
	padding: 0 var(--spacing-s);
}

.htmlDisplay ::v-deep ol,
.htmlDisplay ::v-deep ul {
	padding-left: var(--spacing-s);
}
</style>
