<template>
	<div>
		<div>
			<n8n-input-label label="Label" />
			<n8n-input v-model="label" />
		</div>
		<div class="mt-s">
			<n8n-input-label label="Placeholder" />
			<n8n-input v-model="placeholder" />
		</div>
		<div class="mt-s">
			<n8n-input-label label="Default value" />
			<n8n-input v-model="defaultValue" />
		</div>
		<div class="mt-s">
			<n8n-input-label label="Type" />
			<n8n-select v-model="type">
				<n8n-option label="Text" value="text" />
				<n8n-option label="Password" value="password" />
				<n8n-option label="Textarea" value="textarea" />
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
		label: {
			get(): ElementProps['label'] {
				return this.elementProps.label;
			},
			set(label: ElementProps['label']) {
				this.updateValues({ label });
			},
		},
		placeholder: {
			get(): ElementProps['placeholder'] {
				return this.elementProps.placeholder;
			},
			set(placeholder: ElementProps['placeholder']) {
				this.updateValues({ placeholder });
			},
		},
		defaultValue: {
			get(): ElementProps['defaultValue'] {
				return this.elementProps.defaultValue;
			},
			set(defaultValue: ElementProps['defaultValue']) {
				this.updateValues({ defaultValue });
			},
		},
		type: {
			get(): ElementProps['type'] {
				return this.elementProps.type;
			},
			set(type: ElementProps['type']) {
				this.updateValues({ type });
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
