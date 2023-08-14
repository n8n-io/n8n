<template>
	<TemplatesView :goBackEnabled="true">
		<template #header>
			<div v-if="!notFoundError" :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading v-if="collection && collection.name" tag="h1" size="2xlarge">
						{{ collection.name }}
					</n8n-heading>
					<n8n-text v-if="collection && collection.name" color="text-base" size="small">
						{{ $locale.baseText('templates.collection') }}
					</n8n-text>
					<n8n-loading :loading="!collection || !collection.name" :rows="2" variant="h1" />
				</div>
			</div>
			<div :class="$style.notFound" v-else>
				<n8n-text color="text-base">{{
					$locale.baseText('templates.collectionsNotFound')
				}}</n8n-text>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div :class="$style.wrapper">
				<div :class="$style.mainContent">
					<div :class="$style.markdown" v-if="loading || (collection && collection.description)">
						<n8n-markdown
							:content="collection && collection.description"
							:images="collection && collection.image"
							:loading="loading"
						/>
					</div>
					<TemplateList
						:infinite-scroll-enabled="false"
						:loading="loading"
						:use-workflow-button="true"
						:workflows="loading ? [] : collectionWorkflows"
						@useWorkflow="onUseWorkflow"
						@openTemplate="onOpenTemplate"
					/>
				</div>
				<div :class="$style.details">
					<TemplateDetails
						:block-title="$locale.baseText('template.details.appsInTheCollection')"
						:loading="loading"
						:template="collection"
					/>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import TemplateDetails from '@/components/TemplateDetails.vue';
import TemplateList from '@/components/TemplateList.vue';
import TemplatesView from './TemplatesView.vue';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import type {
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesWorkflow,
	ITemplatesWorkflowFull,
} from '@/Interface';

import { setPageTitle } from '@/utils';
import { VIEWS } from '@/constants';
import { useTemplatesStore } from '@/stores/templates.store';

export default defineComponent({
	name: 'TemplatesCollectionView',
	mixins: [workflowHelpers],
	components: {
		TemplateDetails,
		TemplateList,
		TemplatesView,
	},
	computed: {
		...mapStores(useTemplatesStore),
		collection(): null | ITemplatesCollectionFull {
			return this.templatesStore.getCollectionById(this.collectionId);
		},
		collectionId(): string {
			return this.$route.params.id;
		},
		collectionWorkflows(): Array<ITemplatesWorkflow | ITemplatesWorkflowFull | null> | null {
			if (!this.collection) {
				return null;
			}
			return this.collection.workflows.map(({ id }) => {
				return this.templatesStore.getTemplateById(id.toString());
			});
		},
	},
	data() {
		return {
			loading: true,
			notFoundError: false,
		};
	},
	methods: {
		scrollToTop() {
			setTimeout(() => {
				const contentArea = document.getElementById('content');
				if (contentArea) {
					contentArea.scrollTo({
						top: 0,
						behavior: 'smooth',
					});
				}
			}, 50);
		},
		onOpenTemplate({ event, id }: { event: MouseEvent; id: string }) {
			this.navigateTo(event, VIEWS.TEMPLATE, id);
		},
		onUseWorkflow({ event, id }: { event: MouseEvent; id: string }) {
			const telemetryPayload = {
				template_id: id,
				wf_template_repo_session_id: this.workflowsStore.currentSessionId,
				source: 'collection',
			};
			void this.$externalHooks().run('templatesCollectionView.onUseWorkflow', telemetryPayload);
			this.$telemetry.track('User inserted workflow template', telemetryPayload);

			this.navigateTo(event, VIEWS.TEMPLATE_IMPORT, id);
		},
		navigateTo(e: MouseEvent, page: string, id: string) {
			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				void this.$router.push({ name: page, params: { id } });
			}
		},
	},
	watch: {
		collection(collection: ITemplatesCollection) {
			if (collection) {
				setPageTitle(`n8n - Template collection: ${collection.name}`);
			} else {
				setPageTitle('n8n - Templates');
			}
		},
	},
	async mounted() {
		this.scrollToTop();

		if (this.collection && (this.collection as ITemplatesCollectionFull).full) {
			this.loading = false;
			return;
		}

		try {
			await this.templatesStore.fetchCollectionById(this.collectionId);
		} catch (e) {
			this.notFoundError = true;
		}
		this.loading = false;
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: space-between;

	@media (max-width: $breakpoint-xs) {
		display: block;
	}
}

.notFound {
	padding-top: var(--spacing-xl);
}

.title {
	width: 100%;
}

.button {
	display: block;
}

.mainContent {
	padding-right: var(--spacing-2xl);
	margin-bottom: var(--spacing-l);
	width: 100%;

	@media (max-width: $breakpoint-xs) {
		padding-right: 0;
	}
}

.markdown {
	margin-bottom: var(--spacing-l);
}

.details {
	width: 180px;
}
</style>
