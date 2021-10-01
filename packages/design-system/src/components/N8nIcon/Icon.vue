<template functional>
	<component
		:is="$options.components.FontAwesomeIcon"
		:class="$style[`${props.size}${props.theme ? `-${props.theme}`: ''}`]"
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
.small {
	font-size: 0.85em;
	height: 0.85em;
	width: 0.85em !important;
}

.medium {
	font-size: 0.95em;
	height: 0.95em;
	width: 0.95em !important;
}

.large {
	font-size: 1.22em;
	height: 1.22em;
	width: 1.22em !important;
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
