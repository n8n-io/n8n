<template>
	<N8nText :size="size" :color="color" :compact="true" class="n8n-icon" v-bind="$attrs">
		<FontAwesomeIcon :icon="icon" :spin="spin" :class="$style[size]" />
	</N8nText>
</template>

<script lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import N8nText from '../N8nText';

import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nIcon',
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
