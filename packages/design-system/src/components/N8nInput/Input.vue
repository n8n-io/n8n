<template>
	<el-input
		:size="computedSize"
		:class="['n8n-input', ...classes]"
		:autoComplete="autocomplete"
		:name="name"
		ref="innerInput"
		v-bind="{ ...$props, ...$attrs }"
	>
		<template #prepend v-if="$slots.prepend">
			<slot name="prepend" />
		</template>
		<template #append v-if="$slots.append">
			<slot name="append" />
		</template>
		<template #prefix v-if="$slots.prefix">
			<slot name="prefix" />
		</template>
		<template #suffix v-if="$slots.suffix">
			<slot name="suffix" />
		</template>
	</el-input>
</template>

<script lang="ts">
import { ElInput } from 'element-plus';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { uid } from '../../utils';

type InputRef = InstanceType<typeof ElInput>;

export default defineComponent({
	name: 'n8n-input',
	components: {
		ElInput,
	},
	props: {
		modelValue: {
			type: [String, Number] as PropType<string | number>,
			default: '',
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
			default: '',
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		readonly: {
			type: Boolean,
			default: false,
		},
		clearable: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: 2,
		},
		maxlength: {
			type: Number,
			default: Infinity,
		},
		title: {
			type: String,
			default: '',
		},
		name: {
			type: String,
			default: () => uid('input'),
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
			const innerInput = this.$refs.innerInput as InputRef | undefined;

			if (!innerInput) return;

			const inputElement = innerInput.$el.querySelector(
				this.type === 'textarea' ? 'textarea' : 'input',
			);

			if (!inputElement) return;

			inputElement.focus();
		},
		blur() {
			const innerInput = this.$refs.innerInput as InputRef | undefined;

			if (!innerInput) return;

			const inputElement = innerInput.$el.querySelector(
				this.type === 'textarea' ? 'textarea' : 'input',
			);

			if (!inputElement) return;

			inputElement.blur();
		},
		select() {
			const innerInput = this.$refs.innerInput as InputRef | undefined;

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
