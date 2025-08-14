<script setup lang="ts">
import type { DataStore } from '@/features/dataStore/datastore.types';
import type { IUser, UserAction } from '@n8n/design-system';
import { DATA_STORE_CARD_ACTIONS } from '@/features/dataStore/constants';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useToast } from '@/composables/useToast';

type Props = {
	dataStore: DataStore;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});

const emit = defineEmits<{
	rename: [
		value: {
			dataStore: DataStore;
			action: string;
		},
	];
	onDeleted: [];
}>();

const dataStoreStore = useDataStoreStore();

const i18n = useI18n();
const message = useMessage();
const toast = useToast();

const actions = computed<Array<UserAction<IUser>>>(() => [
	{
		label: i18n.baseText('generic.rename'),
		value: DATA_STORE_CARD_ACTIONS.RENAME,
		disabled: props.isReadOnly,
	},
	{
		label: i18n.baseText('generic.delete'),
		value: DATA_STORE_CARD_ACTIONS.DELETE,
		disabled: props.isReadOnly,
	},
]);

const onAction = async (action: string) => {
	switch (action) {
		case DATA_STORE_CARD_ACTIONS.RENAME: {
			// This is handled outside of this component
			// where editable label component is used
			emit('rename', {
				dataStore: props.dataStore,
				action: 'rename',
			});
			break;
		}
		case DATA_STORE_CARD_ACTIONS.DELETE: {
			const promptResponse = await message.confirm(
				i18n.baseText('dataStore.delete.confirm.message', {
					interpolate: { name: props.dataStore.name },
				}),
				i18n.baseText('dataStore.delete.confirm.title'),
				{
					confirmButtonText: i18n.baseText('generic.delete'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (promptResponse === MODAL_CONFIRM) {
				await deleteDataStore();
			}
			break;
		}
	}
};

const deleteDataStore = async () => {
	try {
		const deleted = await dataStoreStore.deleteDataStore(
			props.dataStore.id,
			props.dataStore.projectId,
		);
		if (!deleted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		emit('onDeleted');
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.delete.error'));
	}
};
</script>
<template>
	<N8nActionToggle
		:actions="actions"
		theme="dark"
		data-test-id="data-store-card-actions"
		@action="onAction"
	/>
</template>
