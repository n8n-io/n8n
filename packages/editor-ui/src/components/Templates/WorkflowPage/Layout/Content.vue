<template>
	<div>
		<div :class="$style.image">
			<n8n-image :images="template.mainImage" />
		</div>
		<div :class="$style.content">
			<div :class="$style.markdown">
				<n8n-markdown :content="template.description" :images="template.image" :loading="loading" />
			</div>
			<div :class="$style.details">
				<template-details :loading="loading" :template="template" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import TemplateDetails from '@/components/Templates/WorkflowPage/TemplateDetails/TemplateDetails.vue';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IN8nTemplate } from '@/Interface';

import mixins from 'vue-typed-mixins';
export default mixins(workflowHelpers).extend({
	props: ['loading'],
	components: {
		TemplateDetails,
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
});
</script>
<style lang="scss" module>
.image {
	width: 100%;

	img {
		width: 100%;
	}
}

.content {
	padding: var(--spacing-2xl) 0;
	display: flex;
	justify-content: space-between;
}

.markdown {
	width: 100%;
	padding-right: var(--spacing-2xl);
}

.spacer {
	margin: 56px;
}

.details {
	width: 180px;

	@media (max-width: $--breakpoint-xs) {
		width: auto;
	}
}
</style>
