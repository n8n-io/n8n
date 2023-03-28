<template>
	<div>
		<n8n-input-label label="Content" />
		<n8n-input type="textarea" v-model="content" />
	</div>
</template>

<script lang="ts">
import { settingMixin } from '@v-craft/core';
import { ElementProps } from '@/components/form-builder/types';

export default {
	mixins: [settingMixin],
	computed: {
		content: {
			get(): ElementProps['content'] {
				return this.elementProps.content;
			},
			set(value: ElementProps['content']) {
				this.updateContent(value);
			},
		},
	},
	methods: {
		updateContent(content: ElementProps['content']) {
			this.elementPropsSetter({ content });
		},
	},
};
</script>
