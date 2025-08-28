<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type {
	DataStoreColumnCreatePayload,
	DataStoreColumnType,
} from '@/features/dataStore/datastore.types';
import { useI18n } from '@n8n/i18n';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import { COLUMN_NAME_REGEX, MAX_COLUMN_NAME_LENGTH } from '@/features/dataStore/constants';
import Tooltip from '@n8n/design-system/components/N8nTooltip/Tooltip.vue';
import { useDebounce } from '@/composables/useDebounce';

const props = defineProps<{
	// the params key is needed so that we can pass this directly to ag-grid as column
	params: {
		onAddColumn: (column: DataStoreColumnCreatePayload) => void;
	};
	popoverId?: string;
	useTextTrigger?: boolean;
}>();

const i18n = useI18n();
const { getIconForType } = useDataStoreTypes();
const { debounce } = useDebounce();

const nameInputRef = ref<HTMLInputElement | null>(null);

const columnName = ref('');
const columnType = ref<DataStoreColumnType>('string');

const columnTypes: DataStoreColumnType[] = ['string', 'number', 'boolean', 'date'];

const error = ref<string | null>(null);

// Handling popover state manually to prevent it closing when interacting with dropdown
const popoverOpen = ref(false);
const isSelectOpen = ref(false);

const popoverId = computed(() => props.popoverId ?? 'add-column-popover');

const onAddButtonClicked = () => {
	if (!columnName.value || !columnType.value) {
		return;
	}
	props.params.onAddColumn({ name: columnName.value, type: columnType.value });
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

const validateName = () => {
	if (error.value) {
		error.value = null;
	}
	if (columnName.value && !COLUMN_NAME_REGEX.test(columnName.value)) {
		error.value = i18n.baseText('dataStore.addColumn.invalidName.error');
	}
};

const onInput = debounce(validateName, { debounceTime: 100 });
</script>

<template>
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('dataStore.addColumn.label')">
		<div class="add-column-header-component-wrapper">
			<N8nPopoverReka
				:id="popoverId"
				:open="popoverOpen"
				:popper-options="{ strategy: 'fixed' }"
				:show-arrow="false"
				@update:open="handlePopoverOpenChange"
			>
				<template #trigger>
					<template v-if="props.useTextTrigger">
						<N8nButton data-test-id="data-store-add-column-trigger-button" type="tertiary">
							{{ i18n.baseText('dataStore.addColumn.label') }}
						</N8nButton>
					</template>
					<template v-else>
						<N8nIconButton
							data-test-id="data-store-add-column-trigger-button"
							text
							icon="plus"
							type="tertiary"
						/>
					</template>
				</template>
				<template #content>
					<div class="add-ds-column-header-popover-content">
						<div class="popover-body">
							<N8nInputLabel
								:label="i18n.baseText('dataStore.addColumn.nameInput.label')"
								:required="true"
								:class="error ? '' : 'mb-s'"
							>
								<N8nInput
									ref="nameInputRef"
									v-model="columnName"
									:placeholder="i18n.baseText('dataStore.addColumn.nameInput.placeholder')"
									:maxlength="MAX_COLUMN_NAME_LENGTH"
									@keyup.enter="onAddButtonClicked"
									@input="onInput"
								/>
								<div v-if="error" class="error-message">
									<n8n-text size="small" color="danger" tag="span">
										{{ error }}
									</n8n-text>
									<Tooltip :content="i18n.baseText('dataStore.addColumn.invalidName.description')">
										<N8nIcon
											icon="circle-help"
											size="small"
											class="error-tooltip"
											color="text-base"
											data-test-id="add-column-error-help-icon"
										/>
									</Tooltip>
								</div>
							</N8nInputLabel>
							<N8nInputLabel
								:label="i18n.baseText('dataStore.addColumn.typeInput.label')"
								:required="true"
								class="type-label"
							>
								<N8nSelect
									v-model="columnType"
									:append-to="`#${popoverId}`"
									@visible-change="isSelectOpen = $event"
								>
									<N8nOption v-for="type in columnTypes" :key="type" :value="type">
										<div class="add-column-option-content">
											<N8nIcon :icon="getIconForType(type)" />
											<N8nText>{{ type }}</N8nText>
										</div>
									</N8nOption>
								</N8nSelect>
							</N8nInputLabel>
							<N8nButton
								data-test-id="data-store-add-column-submit-button"
								type="primary"
								class="mt-m"
								size="large"
								:disabled="!columnName || !columnType || !!error"
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

<style lang="scss">
.add-ds-column-header-popover-content {
	display: flex;
	flex-direction: column;
	width: 300px;

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

	.error-message {
		display: flex;
		align-items: center;
		gap: var(--spacing-4xs);
		color: var(--color-text-danger);
	}

	.error-tooltip {
		cursor: pointer;
	}
}
.add-column-option-content {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}
</style>
