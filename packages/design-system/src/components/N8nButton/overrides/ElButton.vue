<template>
	<n8n-button ref="button" v-bind="attrs" v-on="$listeners">
		<slot />
	</n8n-button>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nButton from '../Button.vue';

const classToTypeMap = {
	'btn--cancel': 'secondary',
};

export default Vue.extend({
	components: {
		N8nButton,
	},
	computed: {
		attrs() {
			let type = 'primary';
			Object.entries(classToTypeMap).forEach(([className, mappedType]) => {
				if (this.$refs.button && (this.$refs.button as Vue).$el.classList.contains(className)) {
					type = mappedType;
				}
			});

			return {
				type,
				...this.$attrs,
			};
		},
	},
});
</script>
