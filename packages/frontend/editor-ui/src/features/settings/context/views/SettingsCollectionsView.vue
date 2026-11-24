<script lang="ts" setup>
import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nHeading,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import CollectionModal from '@/features/settings/context/components/CollectionModal.vue';
import CollectionsTable from '@/features/settings/context/components/CollectionsTable.vue';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const collectionsStore = useCollectionsStore();
const { showError } = useToast();

const modalOpen = ref(false);
const loadFailed = ref(false);
const { next: nextLoad } = useLatestFetch();

// A failed load also reports zero collections, so the empty state must not stand in for it.
const showEmptyState = computed(
	() => !collectionsStore.loading && !loadFailed.value && collectionsStore.count === 0,
);

async function load() {
	const isLatest = nextLoad();
	try {
		await collectionsStore.fetchCollections();
		if (isLatest()) {
			loadFailed.value = false;
		}
	} catch (error) {
		// A newer load owns the page now, so this one reports nothing.
		if (!isLatest()) {
			return;
		}

		loadFailed.value = true;
		showError(error, i18n.baseText('settings.context.collections.error.load'));
	}
}

function openCreateModal() {
	modalOpen.value = true;
}

async function onCreated(collection: KnowledgeCollectionDto) {
	modalOpen.value = false;
	await router.push({
		name: VIEWS.KNOWLEDGE_COLLECTION,
		params: { projectId: collection.homeProject.id, collectionId: collection.id },
	});
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.collections.title'));
	await load();
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.context.collections.back')"
		data-test-id="settings-collections"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.context.collections.title')"
			:description="i18n.baseText('settings.context.collections.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.toolbar">
			<N8nButton
				:label="i18n.baseText('settings.context.collections.actions.create')"
				data-test-id="collections-create-button"
				@click="openCreateModal"
			/>
		</div>

		<CollectionsTable
			:collections="collectionsStore.collections"
			:loading="collectionsStore.loading"
			:show-empty="showEmptyState"
		>
			<template #empty>
				<div :class="$style.empty" data-test-id="collections-empty-state">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('settings.context.collections.empty.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.collections.empty.description') }}
					</N8nText>
					<N8nButton
						:label="i18n.baseText('settings.context.collections.actions.create')"
						data-test-id="collections-empty-create-button"
						@click="openCreateModal"
					/>
				</div>
			</template>
		</CollectionsTable>

		<CollectionModal v-model:open="modalOpen" @saved="load" @created="onCreated" />
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The same frame as the Preferences and Skills pages: the settings shell insets the page, and
   the header is pulled to the left edge of the content. */
.layout {
	padding: 0;

	header {
		margin-inline: 0 auto;
		max-width: none;

		> p {
			display: block;
			max-width: 45rem;
		}
	}
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	width: 100%;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}
</style>
