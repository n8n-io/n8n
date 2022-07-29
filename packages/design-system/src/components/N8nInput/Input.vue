<template>
	<el-input
		v-bind="$props"
		:size="getSize"
		:class="$style[getClass]"
		:ref="ref"
		:autoComplete="autocomplete"
		v-on="$listeners"
	>
		<template #prepend>
			<slot name="prepend" />
		</template>
		<template #append>
			<slot name="append" />
		</template>
		<template #prefix>
			<slot name="prefix" />
		</template>
		<template #suffix>
			<slot name="suffix" />
		</template>
	</el-input>
</template>

<script lang="ts">
import ElInput from 'element-ui/lib/input';
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-input',
	components: {
		ElInput,
	},
	props: {
		value: {
		},
		type: {
			type: String,
			validator: (value: string): boolean =>
				['text', 'textarea', 'number', 'password', 'email'].includes(value),
		},
		size: {
			type: String,
			default: 'large',
			validator: (value: string): boolean =>
				['mini', 'small', 'medium', 'large', 'xlarge'].includes(value),
		},
		placeholder: {
			type: String,
		},
		disabled: {
			type: Boolean,
		},
		clearable: {
			type: Boolean,
		},
		rows: {
			type: Number,
		},
		maxlength: {
			type: Number,
		},
		title: {
			type: String,
		},
		autocomplete: {
			type: String,
			default: 'off',
		},
	},
	data() {
		return {
			ref: null,
		};
	},
	computed: {
		getSize(): string | undefined {
			if (this.size === 'xlarge') {
				return undefined;
			}

			return this.size;
		},
		getClass(): string {
			if (this.size === 'xlarge') {
				return 'xlarge';
			}

			return '';
		},
	},
});
</script>

<style lang="scss" module>
.xlarge {
	--input-font-size: var(--font-size-m);
	input {
		height: 48px;
	}
}
</style>
