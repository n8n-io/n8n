<template functional>
	<component
		:is="$options.components.ElSelect"
		v-bind="props"
		:size="$options.methods.getSize(props.size)"
		:class="$style[$options.methods.getClass(props)]"
		@input="listeners.input"
		@focus="(e) => listeners.focus && listeners.focus(e)"
		@change="(e) => listeners.change && listeners.change(e)"
		@blur="(e) => listeners.blur && listeners.blur(e)"
		@remove-tag="(e) => listeners.removeTag && listeners.removeTag(e)"
		@visible-change="(e) => listeners.visibleChange && listeners.visibleChange(e)"
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
				['mini', 'small', 'medium', 'large', 'xlarge'].indexOf(value) !== -1,
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
	},
	methods: {
		getSize(size: string): string | undefined {
			if (size === 'xlarge') {
				return undefined;
			}

			return size;
		},
		getClass(props: { size: string }): string {
			if (props.size === 'xlarge') {
				return 'xlarge';
			}

			return '';
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
</style>
