<template>
	<div :class="$style.header">
		<go-back-button />
		<div :class="$style.wrapper">
			<div :class="$style.title">
				<n8n-heading v-if="!loading" tag="h1" size="2xlarge">{{ collection.name }}</n8n-heading>
				<n8n-loading :animated="true" :loading="loading" :rows="2" variant="h1" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import GoBackButton from '@/components/GoBackButton.vue';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IN8nCollection } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'WokrflowPageHeader',
	components: {
		GoBackButton,
	},
	computed: {
		collection(): IN8nCollection {
			return this.$store.getters['templates/getCollection'];
		},
	},
	data() {
		return {
			loading: false,
		};
	},
	methods: {},
});
</script>
<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
}

.wrapper {
	padding: var(--spacing-s) 0 0;
	display: flex;
	justify-content: space-between;
}

.title {
	width: 100%;
}

.button {
	display: block;
}
</style>
