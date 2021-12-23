<template>
	<div :class="$style.template">
		<div :class="$style.header">
			<go-back-button />
			<div :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading tag="h1" size="2xlarge">{{ template.name }}</n8n-heading>
				</div>
				<div :class="$style.button">
					<n8n-button
						label="Use this workflow"
						size="large"
						@click="goToWorkflowsTemplate(template.id)"
					/>
				</div>
			</div>
		</div>
		<div>
			<div :class="$style.image">
				<n8n-image :images="template.mainImage" />
			</div>
			<div :class="$style.content">
				<div :class="$style.markdown">
					<markdown-viewer :content="template.description" :images="template.image" />
				</div>
				<div :class="$style.details">
					<template-details :template="template" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import GoBackButton from '../components/GoBackButton.vue';
import MarkdownViewer from '../components/MarkdownViewer.vue';
import TemplateDetails from '../components/TemplateDetails/TemplateDetails.vue';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'TemplateView',
	components: {
		GoBackButton,
		MarkdownViewer,
		TemplateDetails,
	},
	computed: {
		template() {
			return this.$store.getters['templates/getTemplate'];
		},
	},
	methods: {
		goToWorkflowsTemplate(templateId: string) {
			this.$router.push(`/workflows/templates/${templateId}`);
		},
	},
	async mounted() {
		const templateId = this.$route.params.id;
		const response = await this.$store.dispatch('templates/getTemplateById', templateId);
		if (!response) {
			this.$showMessage({
				title: 'Error',
				message: 'Could not find workflow template',
				type: 'error',
			});
			setTimeout(() => {
				this.$router.go(-1);
			}, 2000);
		}
	},
});
</script>

<style lang="scss" module>
.template {
	max-width: calc(100% - 48px);
	margin: 0 auto;
	padding-left: 64px;
}

.header {
	padding: 48px 0px 40px;
	display: flex;
	flex-direction: column;
}

.wrapper {
	padding: 16px 0 0;
	display: flex;
	justify-content: space-between;
}

.title {
	width: 75%;
}

.button {
	display: block;
}

.image {
	width: 100%;

	img {
		width: 100%;
	}
}

.content {
	padding: 40px 0;
	display: flex;
	justify-content: space-between;
}

.markdown {
	width: 75%;
}

.details {
	width: 20%;
}
</style>
