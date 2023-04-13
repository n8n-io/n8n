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
		<el-select
			v-bind="$props"
			:value="value"
			:size="computedSize"
			:class="$style[classes]"
			:popper-class="popperClass"
			v-on="$listeners"
			ref="innerSelect"
		>
			<template #prefix>
				<slot name="prefix" />
			</template>
			<template #suffix>
				<slot name="suffix" />
			</template>
			<template #default>
				<slot></slot>
			</template>
		</el-select>
	</div>
</template>

<script lang="ts">
import { Select as ElSelect } from 'element-ui';
import { defineComponent } from 'vue';

export interface IProps {
	size?: string;
	limitPopperWidth?: string;
	popperClass?: string;
}

export default defineComponent({
	name: 'n8n-select',
	components: {
		ElSelect,
	},
	props: {
		value: {},
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
		computedSize(): string | undefined {
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
			const select = this.$refs.innerSelect as (Vue & HTMLElement) | undefined;
			if (select) {
				select.focus();
			}
		},
		blur() {
			const select = this.$refs.innerSelect as (Vue & HTMLElement) | undefined;
			if (select) {
				select.blur();
			}
		},
		focusOnInput() {
			const select = this.$refs.innerSelect as (Vue & HTMLElement) | undefined;
			if (select) {
				const input = select.$refs.input as (Vue & HTMLElement) | undefined;
				if (input) {
					input.focus();
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
