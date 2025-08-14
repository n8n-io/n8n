<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type {
	DataStoreColumnCreatePayload,
	DataStoreColumnType,
} from '@/features/dataStore/datastore.types';
import { useI18n } from '@n8n/i18n';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';

const emit = defineEmits<{
	addColumn: [
		value: {
			column: DataStoreColumnCreatePayload;
		},
	];
}>();

const i18n = useI18n();
const { getIconForType } = useDataStoreTypes();

const nameInputRef = ref<HTMLInputElement | null>(null);

const columnName = ref('');
const columnType = ref<DataStoreColumnType>('string');
const columnTypes = ref<DataStoreColumnType[]>(['string', 'number', 'boolean', 'date']);

// Handling popover state manually to prevent it closing when interacting with dropdown
const popoverOpen = ref(false);
const isSelectOpen = ref(false);

const onAddButtonClicked = () => {
	// TODO:
	// - Validate name before emitting event
	if (!columnName.value || !columnType.value) {
		return;
	}
	emit('addColumn', {
		column: {
			name: columnName.value,
			type: columnType.value,
		},
	});
	columnName.value = '';
	columnType.value = 'string';
	popoverOpen.value = false;
};

const handlePopoverOpenChange = async (open: boolean) => {
	// Don't close the popover if the select is open
	if (!open && isSelectOpen.value) {
		return;
	}
	popoverOpen.value = open;
	// Focus name input when opening popover
	if (open) {
		await nextTick(() => {
			nameInputRef.value?.focus();
		});
	}
};
</script>

<template>
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('dataStore.addColumn.label')">
		<div :class="$style.wrapper">
			<N8nPopoverReka
				id="add-column-popover"
				ref="popoverRef"
				:open="popoverOpen"
				:popper-options="{ strategy: 'fixed' }"
				:show-arrow="false"
				@update:open="handlePopoverOpenChange"
			>
				<template #trigger>
					<N8nIconButton icon="plus" type="tertiary" />
				</template>
				<template #content>
					<div :class="$style['popover-content']">
						<div :class="$style['popover-body']">
							<N8nInputLabel
								:label="i18n.baseText('dataStore.addColumn.nameInput.label')"
								:required="true"
							>
								<N8nInput
									ref="nameInputRef"
									v-model="columnName"
									:placeholder="i18n.baseText('dataStore.addColumn.nameInput.placeholder')"
									@keyup.enter="onAddButtonClicked"
								/>
							</N8nInputLabel>
							<N8nInputLabel
								:label="i18n.baseText('dataStore.addColumn.typeInput.label')"
								:required="true"
								:class="$style['type-label']"
							>
								<N8nSelect
									v-model="columnType"
									append-to="#add-column-popover"
									@visible-change="isSelectOpen = $event"
								>
									<N8nOption v-for="type in columnTypes" :key="type" :value="type">
										<div :class="$style['option-content']">
											<N8nIcon :icon="getIconForType(type)" />
											<N8nText>{{ type }}</N8nText>
										</div>
									</N8nOption>
								</N8nSelect>
							</N8nInputLabel>
							<N8nButton
								type="primary"
								:disabled="!columnName || !columnType"
								@click="onAddButtonClicked"
							>
								{{ i18n.baseText('dataStore.addColumn.label') }}
							</N8nButton>
						</div>
					</div>
				</template>
			</N8nPopoverReka>
		</div>
	</N8nTooltip>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	align-items: center;
	background: var(--color-background-base);
	padding: var(--spacing-2xs);
	border: var(--border-base);
	border-left: none;
	height: 50px;
}

.popover-content {
	display: flex;
	flex-direction: column;
	min-width: 300px;
}

.popover-header {
	padding: var(--spacing-2xs);
	border-bottom: var(--border-base);
}

.popover-body {
	padding: var(--spacing-xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.option-content {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}
</style>
