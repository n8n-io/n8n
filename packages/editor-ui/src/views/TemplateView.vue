<template>
<div :class="$style.template">
	<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
		<div :class="$style.header">
			<router-view name="header" :loading="loading" />
		</div>
		<div :class="$style.content">
			<router-view :loading="loading" />
		</div>
	</div>
</div>
</template>

<script lang="ts">
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'TemplateView',
	computed: {
		isMenuCollapsed() {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
	data() {
		return {
			loading: false,
		};
	},
	async mounted() {
		this.loading = true;
		const templateId = this.$route.params.id;
		const response = await this.$store.dispatch('templates/getTemplateById', templateId);
		if (!response) {
			this.$showMessage({
				title: 'Error',
				message: 'Could not find workflow template',
				type: 'error',
			});
			setTimeout(() => {
				// this.$router.go(-1);
			}, 2000);
		}
		this.loading = false;
	},
});
</script>

<style lang="scss" module>
.template {
	width: 100%;
	display: flex;
	justify-content: center;
	background-color: var(--color-background-light);
}

.container {
	width: 100%;
	max-width: 1024px;
	margin: 0 var(--spacing-3xl) 0 129px;
	padding: var(--spacing-3xl) 0 var(--spacing-3xl);

	@media (max-width: $--breakpoint-md) {
		width: 900px;
		margin: 0 var(--spacing-2xl) 0 113px;
		padding: var(--spacing-2xl) 0 var(--spacing-2xl);
	}
}

.expanded {
	margin-left: 248px;

	@media (max-width: $--breakpoint-2xs) {
		margin-left: 113px;
	}
}

.header {
	padding: 0px 0px var(--spacing-2xl);
}
</style>
