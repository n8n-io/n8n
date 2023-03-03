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
	'el-picker-panel__link-btn': 'secondary',
};

export default Vue.extend({
	components: {
		N8nButton,
	},
	computed: {
		attrs() {
			let type = this.$attrs.type || 'primary';

			// Element UI Button can have 'text' type which is not supported by n8n-button so render it as 'secondary'
			if (type === 'text') {
				type = 'secondary';
			}

			Object.entries(classToTypeMap).forEach(([className, mappedType]) => {
				if (this.$refs.button && (this.$refs.button as Vue).$el.classList.contains(className)) {
					type = mappedType;
				}
			});

			delete this.$attrs.type;

			return {
				...this.$attrs,
				type,
			};
		},
	},
});
</script>
