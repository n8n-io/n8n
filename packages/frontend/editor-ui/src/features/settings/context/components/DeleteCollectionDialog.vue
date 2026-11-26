<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';

import { useCollectionsStore } from '@/features/settings/context/collections.store';

/** Rendered by the collections page while it deletes a collection: `close`, then `deleted`. */
const props = defineProps<{
	collection: KnowledgeCollectionDto;
}>();

const emit = defineEmits<{
	close: [];
	deleted: [collection: KnowledgeCollectionDto];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const collectionsStore = useCollectionsStore();

const deleting = ref(false);

const agentCount = computed(() => props.collection.agentCount);

function close() {
	// A delete that runs must end first, so its result has a dialog to report to.
	if (deleting.value) {
		return;
	}

	emit('close');
}

function onOpenChange(open: boolean) {
	if (!open) {
		close();
	}
}

async function deleteCollection() {
	if (deleting.value) {
		return;
	}

	const collection = props.collection;

	deleting.value = true;
	try {
		await collectionsStore.deleteCollection(collection.homeProject.id, collection.id);
		showMessage({
			title: i18n.baseText('settings.context.collections.delete.success', {
				interpolate: { name: collection.name },
			}),
			type: 'success',
		});
		emit('deleted', collection);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.collections.error.delete'));
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		open
		:header="
			i18n.baseText('settings.context.collections.delete.title', {
				interpolate: { name: collection.name },
			})
		"
		data-test-id="collection-delete-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p">
				{{ i18n.baseText('settings.context.collections.delete.message') }}
			</N8nText>
			<N8nCallout
				v-if="agentCount > 0"
				theme="warning"
				data-test-id="collection-delete-agents-warning"
			>
				{{
					i18n.baseText('settings.context.collections.delete.agents', {
						interpolate: { count: agentCount },
						adjustToNumber: agentCount,
					})
				}}
			</N8nCallout>
			<N8nText v-else tag="p" data-test-id="collection-delete-no-agents">
				{{ i18n.baseText('settings.context.collections.delete.noAgents') }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="deleting"
				:label="i18n.baseText('settings.context.collections.delete.cancel')"
				data-test-id="collection-delete-cancel"
				@click="close"
			/>
			<N8nButton
				variant="destructive"
				:loading="deleting"
				:label="i18n.baseText('settings.context.collections.delete.confirm')"
				data-test-id="collection-delete-confirm"
				@click="deleteCollection"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	gap: var(--spacing--sm);
}
</style>
