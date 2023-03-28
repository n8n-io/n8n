<template>
	<div>
		<div>
			<n8n-input-label label="Content" />
			<n8n-input v-model="content" />
		</div>
		<div class="mt-s">
			<n8n-input-label label="Level" />
			<n8n-select v-model="level">
				<n8n-option label="Heading 1" value="h1" />
				<n8n-option label="Heading 2" value="h2" />
				<n8n-option label="Heading 3" value="h3" />
				<n8n-option label="Heading 4" value="h4" />
				<n8n-option label="Heading 5" value="h5" />
				<n8n-option label="Heading 6" value="h6" />
			</n8n-select>
		</div>
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
			set(content: ElementProps['content']) {
				this.updateContent({ content });
			},
		},
		level: {
			get(): ElementProps['level'] {
				return this.elementProps.level;
			},
			set(level: ElementProps['level']) {
				this.updateLevel({ level });
			},
		},
	},
	methods: {
		updateValues(values: ElementProps) {
			this.elementPropsSetter(values);
		},
	},
};
</script>
