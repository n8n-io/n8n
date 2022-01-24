<template>
	<div :class="$style.header">
		<div :class="$style.wrapper">
			<div :class="$style.title">
				<n8n-heading v-if="!loading" tag="h1" size="2xlarge">
					{{ $locale.baseText('templates.heading') }}
				</n8n-heading>
				<n8n-loading :animated="true" :loading="loading" :rows="1" variant="h1" />
			</div>
			<div :class="$style.button">
				<n8n-button
					v-if="!loading"
					size="large"
					type="outline"
					:label="$locale.baseText('templates.newButton')"
					@click="openNewWorkflow"
				/>
				<n8n-loading :animated="true" :loading="loading" :rows="1" variant="button" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'Header',
	methods: {
		openNewWorkflow() {
			this.$router.push({ name: 'NodeViewNew' });
		},
	},
	data() {
		return {
			loading: false,
		};
	},
});
</script>
<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
}

.wrapper {
	display: flex;
	justify-content: space-between;
}

.title {
	width: 75%;
}

.button {
	display: block;
}
</style>
