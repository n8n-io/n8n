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
	},
};
</script>

