<template>
<div :class="$style.template">
	<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
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
		<div>
			<div :class="$style.image">
				<n8n-image :images="template.mainImage" />
			</div>
			<div :class="$style.content">
				<div :class="$style.markdown">
					<markdown-viewer
						:content="template.description"
						:images="template.image"
						:loading="loading"
					/>
				</div>
				<div :class="$style.details">
					<template-details :loading="loading" :template="template" />
				</div>
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
		isMenuCollapsed() {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
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
				this.$router.go(-1);
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
		max-width: 900px;
		margin: 0 var(--spacing-2xl) 0 113px;
		padding: var(--spacing-2xl) 0 var(--spacing-2xl);
	}
}

.expanded {
	margin-left: 248px;
}

.header {
	padding: 0px 0px var(--spacing-2xl);
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
