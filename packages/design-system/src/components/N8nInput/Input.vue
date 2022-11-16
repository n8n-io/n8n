<template>
	<el-input
		v-bind="$props"
		:size="computedSize"
		:class="['n8n-input', ...classes]"
		:autoComplete="autocomplete"
		ref="innerInput"
		v-on="$listeners"
		:name="name"
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
		ElInput, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
	},
	props: {
		value: {},
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
		readonly: {
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
		name: {
			type: String,
		},
		autocomplete: {
			type: String,
			default: 'off',
		},
	},
	computed: {
		computedSize(): string | undefined {
			if (this.size === 'xlarge') {
				return undefined;
			}

			return this.size;
		},
		classes(): string[] {
			if (this.size === 'xlarge') {
				return ['xlarge'];
			}

			return [];
		},
	},
	methods: {
		focus() {
			const innerInput = this.$refs.innerInput as Vue | undefined;

			if (!innerInput) return;

			const inputElement = innerInput.$el.querySelector(
				this.type === 'textarea' ? 'textarea' : 'input',
			);

			if (!inputElement) return;

			inputElement.focus();
		},
		blur() {
			const innerInput = this.$refs.innerInput as Vue | undefined;

			if (!innerInput) return;

			const inputElement = innerInput.$el.querySelector(
				this.type === 'textarea' ? 'textarea' : 'input',
			);

			if (!inputElement) return;

			inputElement.blur();
		},
		select() {
			const innerInput = this.$refs.innerInput as Vue | undefined;

			if (!innerInput) return;

			const inputElement = innerInput.$el.querySelector(
				this.type === 'textarea' ? 'textarea' : 'input',
			);

			if (!inputElement) return;

			inputElement.select();
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
