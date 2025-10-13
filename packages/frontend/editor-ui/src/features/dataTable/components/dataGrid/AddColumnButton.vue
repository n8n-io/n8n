<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type {
	AddColumnResponse,
	DataTableColumnCreatePayload,
	DataTableColumnType,
} from '@/features/dataTable/dataTable.types';
import { DATA_TABLE_COLUMN_TYPES } from '@/features/dataTable/dataTable.types';
import { useI18n } from '@n8n/i18n';
import { useDataTableTypes } from '@/features/dataTable/composables/useDataTableTypes';
import { COLUMN_NAME_REGEX, MAX_COLUMN_NAME_LENGTH } from '@/features/dataTable/constants';
import { useDebounce } from '@/composables/useDebounce';

import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nPopoverReka,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
type FormError = {
	message?: string;
	description?: string;
};

const props = defineProps<{
	// the params key is needed so that we can pass this directly to ag-grid as column
	params: {
		onAddColumn: (column: DataTableColumnCreatePayload) => Promise<AddColumnResponse>;
	};
	popoverId?: string;
	useTextTrigger?: boolean;
}>();

const i18n = useI18n();
const { getIconForType } = useDataTableTypes();
const { debounce } = useDebounce();

const nameInputRef = ref<HTMLInputElement | null>(null);

const columnName = ref('');
const columnType = ref<DataTableColumnType>('string');

const columnTypes: DataTableColumnType[] = [...DATA_TABLE_COLUMN_TYPES];

const error = ref<FormError | null>(null);

// Handling popover state manually to prevent it closing when interacting with dropdown
const popoverOpen = ref(false);
const isSelectOpen = ref(false);

const popoverId = computed(() => props.popoverId ?? 'add-column-popover');

const columnTypeOptions = computed(() => {
	// Renaming 'date' to 'datetime' but only in UI label
	// we still want to use 'date' as value so nothing breaks
	return columnTypes.map((type) => ({
		label: type === 'date' ? 'datetime' : type,
		value: type,
	}));
});

const onAddButtonClicked = async () => {
	validateName();
	if (!columnName.value || !columnType.value || error.value) {
		return;
	}
	const response = await props.params.onAddColumn({
		name: columnName.value,
		type: columnType.value,
	});

	if (!response.success) {
		let errorMessage = i18n.baseText('dataTable.addColumn.error');
		let errorDescription = response.errorMessage;
		// Provide custom error message for conflict (column already exists)
		if (response.httpStatus === 409) {
			errorMessage = i18n.baseText('dataTable.addColumn.alreadyExistsError', {
				interpolate: { name: columnName.value },
			});
			errorDescription = response.errorMessage?.includes('system')
				? i18n.baseText('dataTable.addColumn.systemColumnDescription')
				: response.errorMessage?.includes('testing')
					? i18n.baseText('dataTable.addColumn.testingColumnDescription')
					: i18n.baseText('dataTable.addColumn.alreadyExistsDescription');
		}
		error.value = {
			message: errorMessage,
			description: errorDescription,
		};

		return;
	}
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
		error.value = {
			message: i18n.baseText('dataTable.addColumn.invalidName.error'),
			description: i18n.baseText('dataTable.addColumn.invalidName.description'),
		};
	}
};

const onInput = debounce(validateName, { debounceTime: 100 });
</script>

<template>
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('dataTable.addColumn.label')">
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
						<N8nButton data-test-id="data-table-add-column-trigger-button" type="tertiary">
							{{ i18n.baseText('dataTable.addColumn.label') }}
						</N8nButton>
					</template>
					<template v-else>
						<N8nIconButton
							data-test-id="data-table-add-column-trigger-button"
							text
							icon="plus"
							type="tertiary"
						/>
					</template>
				</template>
				<template #content>
					<div
						class="add-ds-column-header-popover-content"
						data-test-id="add-column-popover-content"
					>
						<div class="popover-body">
							<N8nInputLabel
								:label="i18n.baseText('dataTable.addColumn.nameInput.label')"
								:required="true"
								:class="error ? '' : 'mb-s'"
							>
								<N8nInput
									ref="nameInputRef"
									v-model="columnName"
									:placeholder="i18n.baseText('dataTable.addColumn.nameInput.placeholder')"
									:maxlength="MAX_COLUMN_NAME_LENGTH"
									data-test-id="add-column-name-input"
									@keyup.enter="onAddButtonClicked"
									@input="onInput"
								/>
								<div v-if="error" class="error-message">
									<N8nText v-if="error.message" size="small" color="danger" tag="span">
										{{ error.message }}
									</N8nText>
									<N8nTooltip
										:content="error.description"
										placement="top"
										:disabled="!error.description"
									>
										<N8nIcon
											icon="circle-help"
											size="small"
											class="error-tooltip"
											color="text-base"
											data-test-id="add-column-error-help-icon"
										/>
									</N8nTooltip>
								</div>
							</N8nInputLabel>
							<N8nInputLabel
								:label="i18n.baseText('dataTable.addColumn.typeInput.label')"
								:required="true"
								class="type-label"
							>
								<N8nSelect
									v-model="columnType"
									:append-to="`#${popoverId}`"
									@visible-change="isSelectOpen = $event"
								>
									<N8nOption
										v-for="option in columnTypeOptions"
										:key="option.value"
										:label="option.label"
										:value="option.value"
									>
										<div class="add-column-option-content">
											<N8nIcon :icon="getIconForType(option.value)" />
											<N8nText>{{ option.label }}</N8nText>
										</div>
									</N8nOption>
								</N8nSelect>
							</N8nInputLabel>
							<N8nButton
								data-test-id="data-table-add-column-submit-button"
								type="primary"
								class="mt-m"
								size="large"
								:disabled="!columnName || !columnType || !!error"
								@click="onAddButtonClicked"
							>
								{{ i18n.baseText('dataTable.addColumn.label') }}
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
		padding: var(--spacing--2xs);
		border-bottom: var(--border);
	}

	.popover-body {
		padding: var(--spacing--xs);
		display: flex;
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: var(--spacing--4xs);
		color: var(--color--text--danger);
	}

	.error-tooltip {
		cursor: pointer;
	}
}
.add-column-option-content {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
