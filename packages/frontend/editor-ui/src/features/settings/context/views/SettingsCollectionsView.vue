<script lang="ts" setup>
import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import CollectionModal from '@/features/settings/context/components/CollectionModal.vue';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { showMessage } = useToast();

const modalOpen = ref(false);

function openCreateModal() {
	modalOpen.value = true;
}

function onCreated(collection: KnowledgeCollectionDto) {
	modalOpen.value = false;
	showMessage({
		title: i18n.baseText('settings.context.collections.create.success', {
			interpolate: { name: collection.name },
		}),
		type: 'success',
	});
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.context.collections.title'));
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

		<CollectionModal v-model:open="modalOpen" @created="onCreated" />
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
</style>
