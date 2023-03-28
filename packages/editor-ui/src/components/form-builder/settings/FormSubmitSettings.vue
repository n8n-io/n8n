<template>
	<div>
		<div>
			<n8n-input-label label="Content" />
			<n8n-input v-model="content" />
		</div>
		<div class="mt-s">
			<n8n-input-label label="color" />
			<n8n-select v-model="color">
				<n8n-option label="Primary" value="primary" />
				<n8n-option label="Secondary" value="secondary" />
				<n8n-option label="Tertiary" value="tertiary" />
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
				this.updateValues({ content });
			},
		},
		color: {
			get(): ElementProps['color'] {
				return this.elementProps.color;
			},
			set(level: ElementProps['color']) {
				this.updateValues({ color });
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
