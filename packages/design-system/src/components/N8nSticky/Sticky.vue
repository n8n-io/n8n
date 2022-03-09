<template>
	<div 
		:class="$style.sticky"
		:style="styles"
		@dblclick="changeMode"
	>
    <n8n-markdown
			v-if="!isEditable"
		  :content="content"
			theme="sticky"
	  />
		<n8n-input
			v-else
		  :value="content"
			type="textarea"
			@blur="onBlur"
			@change="onChange"
			@focus="onFocus"
			@input="onInput"
	  />
  </div>
</template>

<script lang="ts">
import N8nMarkdown from '../N8nMarkdown';
import N8nInput from '../N8nInput';

export default {
	name: 'n8n-sticky',
	props: {
		content: {
			type: String,
		},
		height: {
			type: Number,
			default: 160,
		},
		readOnly: {
			type: Boolean,
			default: false,
		},
		width: {
			type: Number,
			default: 220,
		}
	},
	components: {
		N8nMarkdown,
		N8nInput,
	},
	computed: {
		styles() {
			return {
				...(this.height ? { height: this.height + 'px' } : { height: '100%' }),
				...(this.width ? { width: this.width + 'px' } : { width: '100%' }),
			};
		},
	},
	data() {
		return {
			isEditable: false
		}
	},
	methods: {
		changeMode() {
			if (!this.readOnly)
			this.isEditable =! this.isEditable;
		},
		onBlur() {
			this.$emit('blur');
		},
		onChange(value: string) {
			this.$emit('change', value);
		},
		onFocus() {
			this.$emit('focus');
		},
		onInput(value: string) {
			this.$emit('input', value);
		}
	}
};
</script>

<style lang="scss" module>
.sticky {
	min-width: 150px;
	min-height: 80px;
	overflow-y: auto;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl);
	background-color: #FFF6D7;
	border: 1px solid #F2DDA6;
	border-radius: var(--border-radius-large);
}
</style>
