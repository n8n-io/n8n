<template functional>
	<component
		:is="$options.components.FontAwesomeIcon"
		:class="$style[`_${props.size}`]"
		:icon="props.icon"
		:spin="props.spin"
	/>
</template>

<script lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
	name: 'n8n-icon',
	components: {
		FontAwesomeIcon,
	},
	props: {
		icon: {
			type: String,
			required: true,
		},
		size: {
			type: String,
			default: 'medium',
			validator: function (value: string): boolean {
				return ['small', 'medium', 'large'].indexOf(value) !== -1;
			},
		},
		spin: {
			type: Boolean,
			default: false,
		},
	},
};
</script>

<style lang="scss" module>
._small {
	font-size: 0.85em;
	height: 0.85em;
	width: 0.85em !important;
}

._medium {
	font-size: 0.95em;
	height: 0.95em;
	width: 0.95em !important;
}

._large {
	font-size: 1.22em;
	height: 1.22em;
	width: 1.22em !important;
}
</style>
