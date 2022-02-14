<template>
	<div ref="content" :class="$style.template">
		<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
			<div :class="$style.header">
				<go-back-button />
				<div :class="$style.wrapper">
					<div :class="$style.title">
						<n8n-heading v-if="!loading" tag="h1" size="2xlarge">{{ collection.name }}</n8n-heading>
						<n8n-text v-if="!loading" color="text-base" size="small" :bold="true">
							{{ $locale.baseText('templates.collection') }}
						</n8n-text>
						<n8n-loading :animated="true" :loading="loading" :rows="2" variant="h1" />
					</div>
				</div>
			</div>
			<div :class="$style.content">
				<div :class="$style.markdown">
					<n8n-markdown
						:content="collection.description"
						:images="collection.image"
						:loading="loading"
					/>
					<TemplateList
						:abbreviate-number="abbreviateNumber"
						:infinity-scroll="false"
						:loading="loading"
						:navigate-to="navigateTo"
						:node-icon-size="18"
						:use-workflow-button="true"
						:workflows="collection.workflows"
					/>
				</div>
				<div :class="$style.details">
					<TemplateDetails :loading="loading" :template="collection" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import GoBackButton from '@/components/GoBackButton.vue';
import TemplateDetails from '@/components/TemplateDetails.vue';
import TemplateList from '@/components/TemplateList.vue';

import { abbreviateNumber } from '@/components/helpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IN8nCollection } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'CollectionView',
	components: {
		GoBackButton,
		TemplateDetails,
		TemplateList,
	},
	computed: {
		collection(): IN8nCollection {
			return this.$store.getters['templates/getCollection'];
		},
		isMenuCollapsed() {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
	data() {
		return {
			loading: true,
		};
	},
	methods: {
		abbreviateNumber,
		navigateTo(id: string, page: string, e: PointerEvent) {
			if (page === 'WorkflowTemplate') {
				this.$store.dispatch('templates/setTemplateSessionId', null);
				this.$telemetry.track('User inserted workflow template', {
					template_id: id,
					new_workflow_id: id,
					source: 'collection',
				});
			}

			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: page, params: { id } });
			}
		},
		scrollToTop() {
			setTimeout(() => {
				window.scrollTo({
					top: 0,
					behavior: 'smooth',
				});
			}, 50);
		},
	},
	async mounted() {
		const collectionId = this.$route.params.id;
		const response = await this.$store.dispatch('templates/getCollectionById', collectionId);
		if (!response) {
			this.$showMessage({
				title: 'Error',
				message: 'Could not find collection',
				type: 'error',
			});
		}
		this.loading = false;
		this.scrollToTop();
	},
});
</script>

<style lang="scss" module>
.template {
	width: calc(100vw - 20px);
	height: 100%;
	min-height: 100vh;
	position: relative;
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

.content {
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
