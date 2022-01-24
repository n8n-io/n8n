<template>
	<div :class="$style.header">
		<go-back-button />
		<div :class="$style.wrapper">
			<div :class="$style.title">
				<n8n-heading v-if="!loading" tag="h1" size="2xlarge">{{ template.name }}</n8n-heading>
				<n8n-loading :animated="true" :loading="loading" :rows="2" variant="h1" />
			</div>
			<div :class="$style.button">
				<n8n-button
					v-if="!loading"
					:label="$locale.baseText('template.buttons.useThisWorkflowButton')"
					size="large"
					@click="goToWorkflowsTemplate(template.id)"
				/>
				<n8n-loading :animated="true" :loading="loading" :rows="1" variant="button" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import GoBackButton from '@/components/GoBackButton.vue';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IN8nTemplate } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'TemplateView',
	components: {
		GoBackButton,
	},
	computed: {
		template() {
			let template = {} as IN8nTemplate;
			const templates = this.$store.getters['templates/getTemplates'];
			templates.forEach((element: IN8nTemplate) => {
				if (element.id === this.$route.params.id) {
					template = element;
				}
			});
			return template;
		},
	},
	data() {
		return {
			loading: false,
		};
	},
	methods: {
		goToWorkflowsTemplate(templateId: string) {
			this.$router.push(`/workflows/templates/${templateId}`);
		},
	},
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
	width: 75%;
}

.button {
	display: block;
}
</style>
