<template>
	<n8n-button ref="button" v-bind="attrs" v-on="$listeners">
		<slot />
	</n8n-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import N8nButton from '../Button.vue';

const classToTypeMap = {
	'btn--cancel': 'secondary',
	'el-picker-panel__link-btn': 'secondary',
};

type ButtonRef = InstanceType<typeof N8nButton>;

export default defineComponent({
	components: {
		N8nButton,
	},
	computed: {
		attrs() {
			let type = this.$attrs.type || 'primary';

			/* Element UI Button can have 'text' or 'info' type which is not supported by n8n-button
			 so render it as 'secondary' or 'tertiary' */
			if (type === 'text') {
				type = 'secondary';
			}

			if (type === 'info') {
				type = 'tertiary';
			}

			Object.entries(classToTypeMap).forEach(([className, mappedType]) => {
				if ((this.$refs.button as ButtonRef)?.$el.classList.contains(className)) {
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
