<template functional>
	<component
		:is="$options.components.ElInput"
		v-bind="props"
		:size="$options.methods.getSize(props.size)"
		:class="$style[$options.methods.getClass(props)]"
		@input="listeners.input"
		@focus="(e) => listeners.focus && listeners.focus(e)"
		@change="(e) => listeners.change && listeners.change(e)"
		:ref="data.ref"
	>
		<template v-slot:prefix>
			<slot name="prefix" />
		</template>
		<template v-slot:suffix>
			<slot name="suffix" />
		</template>
	</component>
</template>

<script lang="ts">
import ElInput from 'element-ui/lib/input';

export default {
	name: 'n8n-input',
	components: {
		ElInput,
	},
	props: {
		value: {
			type: String,
		},
		type: {
			type: String,
			validator: (value: string): boolean =>
				['text', 'textarea'].indexOf(value) !== -1,
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
