<template functional>
	<component
		:is="$options.components.ElSelect"
		v-bind="props"
		:value="props.value"
		:size="$options.methods.getSize(props.size)"
		:class="$style[$options.methods.getClass(props)]"
		:popper-class="$options.methods.getPopperClass(props, $style)"
		v-on="listeners"
		:ref="data.ref"
	>
		<template v-slot:prefix>
			<slot name="prefix" />
		</template>
		<template v-slot:suffix>
			<slot name="suffix" />
		</template>
		<template v-slot:default>
			<slot></slot>
		</template>
	</component>
</template>

<script lang="ts">
import ElSelect from 'element-ui/lib/select';

interface IProps {
	size?: string;
	limitPopperWidth?: string;
	popperClass?: string;
}

export default {
	name: 'n8n-select',
	components: {
		ElSelect,
	},
	props: {
		value: {
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
	},
	methods: {
		getSize(size: string): string | undefined {
			if (size === 'xlarge') {
				return undefined;
			}

			return size;
		},
		getClass(props: IProps): string {
			if (props.size === 'xlarge') {
				return 'xlarge';
			}

			return '';
		},
		getPopperClass(props: IProps, $style: any): string {
			let classes = props.popperClass || '';
			if (props.limitPopperWidth) {
				classes = `${classes} ${$style.limitPopperWidth}`;
			}

			return classes;
		},
	},
};
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
</style>
