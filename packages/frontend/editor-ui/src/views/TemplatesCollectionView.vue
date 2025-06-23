<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import TemplateDetails from '@/components/TemplateDetails.vue';
import TemplateList from '@/components/TemplateList.vue';
import TemplatesView from './TemplatesView.vue';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';
import { VIEWS } from '@/constants';
import { useTemplatesStore } from '@/stores/templates.store';
import { useTemplateWorkflow } from '@/utils/templates/templateActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { isFullTemplatesCollection } from '@/utils/templates/typeGuards';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';

const externalHooks = useExternalHooks();
const templatesStore = useTemplatesStore();
const nodeTypesStore = useNodeTypesStore();

const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const i18n = useI18n();
const documentTitle = useDocumentTitle();

const loading = ref(true);
const notFoundError = ref(false);

const collectionId = computed(() => {
	const { id } = route.params;
	return Array.isArray(id) ? id[0] : id;
});

const collection = computed(() => templatesStore.getCollectionById[collectionId.value]);

const collectionWorkflows = computed(() => {
	if (!collection.value || loading.value) {
		return [];
	}
	return collection.value.workflows
		.map(({ id }) => templatesStore.getTemplatesById(id.toString()))
		.filter((workflow): workflow is ITemplatesWorkflow => !!workflow);
});

const scrollToTop = () => {
	setTimeout(() => {
		const contentArea = document.getElementById('content');
		if (contentArea) {
			contentArea.scrollTo({
				top: 0,
				behavior: 'smooth',
			});
		}
	}, 50);
};

const onOpenTemplate = ({ event, id }: { event: MouseEvent; id: number }) => {
	navigateTo(event, VIEWS.TEMPLATE, `${id}`);
};

const onUseWorkflow = async ({ event, id }: { event: MouseEvent; id: number }) => {
	await useTemplateWorkflow({
		router,
		templateId: `${id}`,
		inNewBrowserTab: event.metaKey || event.ctrlKey,
		templatesStore,
		externalHooks,
		nodeTypesStore,
		telemetry,
		source: 'template_list',
	});
};

const navigateTo = (e: MouseEvent, page: string, id: string) => {
	if (e.metaKey || e.ctrlKey) {
		const { href } = router.resolve({ name: page, params: { id } });
		window.open(href, '_blank');
		return;
	} else {
		void router.push({ name: page, params: { id } });
	}
};

watch(
	() => collection.value,
	() => {
		if (collection.value && 'full' in collection.value && collection.value.full) {
			documentTitle.set(`Template collection: ${collection.value.name}`);
		} else {
			documentTitle.set('Templates');
		}
	},
);

onMounted(async () => {
	scrollToTop();

	if (collection.value && 'full' in collection.value && collection.value.full) {
		loading.value = false;
		return;
	}

	try {
		await templatesStore.fetchCollectionById(collectionId.value);
	} catch (e) {
		notFoundError.value = true;
	}
	loading.value = false;
});
</script>

<template>
	<TemplatesView :go-back-enabled="true">
		<template #header>
			<div v-if="!notFoundError" :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading v-if="collection && collection.name" tag="h1" size="2xlarge">
						{{ collection.name }}
					</n8n-heading>
					<n8n-text v-if="collection && collection.name" color="text-base" size="small">
						{{ i18n.baseText('templates.collection') }}
					</n8n-text>
					<n8n-loading :loading="!collection || !collection.name" :rows="2" variant="h1" />
				</div>
			</div>
			<div v-else :class="$style.notFound">
				<n8n-text color="text-base">{{ i18n.baseText('templates.collectionsNotFound') }}</n8n-text>
			</div>
		</template>
		<template v-if="!notFoundError" #content>
			<div :class="$style.wrapper">
				<div :class="$style.mainContent">
					<div v-if="loading || isFullTemplatesCollection(collection)" :class="$style.markdown">
						<n8n-markdown
							:content="
								isFullTemplatesCollection(collection) && collection.description
									? collection.description
									: ''
							"
							:images="
								isFullTemplatesCollection(collection) && collection.image
									? collection.image
									: undefined
							"
							:loading="loading"
						/>
					</div>
					<TemplateList
						:infinite-scroll-enabled="false"
						:loading="loading"
						:use-workflow-button="true"
						:workflows="collectionWorkflows"
						@use-workflow="onUseWorkflow"
						@open-template="onOpenTemplate"
					/>
				</div>
				<div :class="$style.details">
					<TemplateDetails
						:block-title="i18n.baseText('template.details.appsInTheCollection')"
						:loading="loading"
						:template="collection"
					/>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

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
