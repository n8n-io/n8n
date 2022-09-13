<template>
	<n8n-text
		:size="size"
		:color="color"
		:compact="true"
		class="n8n-icon"
	>
		<font-awesome-icon
			:icon="icon"
			:spin="spin"
			:class="$style[size]"
		/>
	</n8n-text>
</template>

<script lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import N8nText from '../N8nText';

import Vue from 'vue';

export default Vue.extend({
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
});
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
