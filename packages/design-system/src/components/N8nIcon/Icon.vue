<template functional>
	<component
		:is="$options.components.N8nText"
		:size="props.size"
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
			type: String,
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
		theme: {
			type: String,
			default: '',
			validator: (value: string) => {
				return ['', 'danger'].includes(value);
			},
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

.small-danger {
	composes: small;
	color: var(--color-danger);
}

.medium-danger {
	composes: medium;
	color: var(--color-danger);
}

.large-danger {
	composes: large;
	color: var(--color-danger);
}
</style>
