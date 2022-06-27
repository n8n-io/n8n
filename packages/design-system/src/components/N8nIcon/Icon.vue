<template functional>
	<component
		:is="$options.components.N8nText"
		:size="props.size"
		:color="props.color"
		:compact="true"
	>
		<component
			:is="$options.components.FontAwesomeIcon"
			:icon="props.icon"
			:spin="props.spin"
			:class="$style[props.size]"
		/>
	</component>
</template>

<script lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import N8nText from '../N8nText';

export default {
	name: 'n8n-icon',
	components: {
		FontAwesomeIcon,
		N8nText,
	},
	props: {
		icon: {
			required: true,
		},
		size: {
			type: String,
			default: 'medium',
		},
		spin: {
			type: Boolean,
			default: false,
		},
		color: {
			type: String,
		},
	},
};
</script>


<style lang="scss" module>
.xlarge {
	width: var(--font-size-xl) !important;
}

.large {
	width: var(--font-size-m) !important;
}

.medium {
	width: var(--font-size-s) !important;
}

.small {
	width: var(--font-size-2xs) !important;
}

.xsmall {
	width: var(--font-size-3xs) !important;
}
</style>
