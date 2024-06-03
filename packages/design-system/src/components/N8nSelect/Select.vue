<template>
	<div
		:class="{
			'n8n-select': true,
			[$style.container]: true,
			[$style.withPrepend]: !!$slots.prepend,
		}"
	>
		<div v-if="$slots.prepend" :class="$style.prepend">
			<slot name="prepend" />
		</div>
		<ElSelect
			v-bind="{ ...$props, ...listeners }"
			ref="innerSelect"
			:model-value="modelValue"
			:size="computedSize"
			:class="$style[classes]"
			:popper-class="popperClass"
		>
			<template v-if="$slots.prefix" #prefix>
				<slot name="prefix" />
			</template>
			<template v-if="$slots.suffix" #suffix>
				<slot name="suffix" />
			</template>
			<slot></slot>
		</ElSelect>
	</div>
</template>

<script lang="ts">
import { ElSelect } from 'element-plus';
import { type PropType, defineComponent } from 'vue';
import type { SelectSize } from 'n8n-design-system/types';
import { isEventBindingElementAttribute } from '../../utils';

type InnerSelectRef = InstanceType<typeof ElSelect>;

export default defineComponent({
	name: 'N8nSelect',
	components: {
		ElSelect,
	},
	props: {
		...ElSelect.props,
		modelValue: {},
		size: {
			type: String as PropType<SelectSize>,
			default: 'large',
		},
		placeholder: {
			type: String,
		},
		disabled: {
			type: Boolean,
		},
		filterable: {
			type: Boolean,
		},
		defaultFirstOption: {
			type: Boolean,
		},
		multiple: {
			type: Boolean,
		},
		filterMethod: {
			type: Function,
		},
		loading: {
			type: Boolean,
		},
		loadingText: {
			type: String,
		},
		popperClass: {
			type: String,
		},
		popperAppendToBody: {
			type: Boolean,
		},
		limitPopperWidth: {
			type: Boolean,
		},
		noDataText: {
			type: String,
		},
	},
	computed: {
		listeners() {
			return Object.entries(this.$attrs).reduce<Record<string, (...args: unknown[]) => {}>>(
				(acc, [key, value]) => {
					if (isEventBindingElementAttribute(value, key)) {
						acc[key] = value;
					}

					return acc;
				},
				{},
			);
		},
		computedSize(): InnerSelectRef['$props']['size'] {
			if (this.size === 'medium') {
				return 'default';
			}

			if (this.size === 'xlarge') {
				return undefined;
			}

			return this.size;
		},
		classes(): string {
			if (this.size === 'xlarge') {
				return 'xlarge';
			}

			return '';
		},
		popperClasses(): string {
			let classes = this.popperClass || '';
			if (this.limitPopperWidth) {
				classes = `${classes} ${this.$style.limitPopperWidth}`;
			}

			return classes;
		},
	},
	methods: {
		focus() {
			const selectRef = this.$refs.innerSelect as InnerSelectRef | undefined;
			if (selectRef) {
				selectRef.focus();
			}
		},
		blur() {
			const selectRef = this.$refs.innerSelect as InnerSelectRef | undefined;
			if (selectRef) {
				selectRef.blur();
			}
		},
		focusOnInput() {
			const selectRef = this.$refs.innerSelect as InnerSelectRef | undefined;
			if (selectRef) {
				const inputRef = selectRef.$refs.input as HTMLInputElement | undefined;
				if (inputRef) {
					inputRef.focus();
				}
			}
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

.limitPopperWidth {
	width: 0;

	li > span {
		text-overflow: ellipsis;
		overflow-x: hidden;
	}
}

.container {
	display: inline-flex;
	width: 100%;
}

.withPrepend {
	input {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		@-moz-document url-prefix() {
			padding: 0 var(--spacing-3xs);
		}
	}
}

.prepend {
	font-size: var(--font-size-2xs);
	border: var(--border-base);
	border-right: none;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing-3xs);
	background-color: var(--color-background-light);
	border-bottom-left-radius: var(--input-border-radius, var(--border-radius-base));
	border-top-left-radius: var(--input-border-radius, var(--border-radius-base));
	color: var(--color-text-base);
	white-space: nowrap;
}
</style>
