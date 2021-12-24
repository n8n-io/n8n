<template>
	<div :class="$style.template">
		<div :class="$style.header">
			<go-back-button />
			<div :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading v-if="!loading" tag="h1" size="2xlarge">{{ template.name }}</n8n-heading>
					<!-- <n8n-loading :animated="true" :loading="loading" :rows="2" :variant="'h1'" /> -->
				</div>
				<div :class="$style.button">
					<n8n-button
						v-if="!loading"
						:label="$locale.baseText('template.buttons.useThisWorkflowButton')"
						size="large"
						@click="goToWorkflowsTemplate(template.id)"
					/>
					<!-- <n8n-loading :animated="true" :loading="loading" :rows="1" :variant="'button'" /> -->
				</div>
			</div>
		</div>
		<div>
			<div :class="$style.image">
				<n8n-image v-if="!loading" :images="template.mainImage" />
				<!-- <n8n-loading :animated="true" :loading="loading" :rows="1" :variant="'image'" /> -->
			</div>
			<div :class="$style.content">
				<div :class="$style.markdown">
					<markdown-viewer
						v-if="!loading"
						:content="template.description"
						:images="template.image"
					/>
					<!-- <n8n-loading :animated="true" :loading="loading" :rows="3" :variant="'p'" />
					<div v-if="loading" :class="$style.spacer" />
					<n8n-loading :animated="true" :loading="loading" :rows="3" :variant="'p'" /> -->
				</div>
				<div :class="$style.details">
					<template-details v-if="!loading" :template="template" />
					<!-- <n8n-loading :animated="true" :loading="loading" :rows="5" :variant="'p'" /> -->
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
		setTimeout(() => {
			this.loading = false;
		}, 2000);
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

.spacer {
	margin: 56px;
}

.details {
	width: 20%;
}
</style>
