<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type {
	AddColumnResponse,
	DataTableColumnCreatePayload,
	DataTableColumnType,
} from '@/features/core/dataTable/dataTable.types';
import type { DataTableEnumOption } from '@n8n/api-types';
import { getDefaultDataTableEnumColor } from '@n8n/api-types';
import { DATA_TABLE_COLUMN_TYPES } from '@/features/core/dataTable/dataTable.types';
import { useI18n } from '@n8n/i18n';
import { useDataTableTypes } from '@/features/core/dataTable/composables/useDataTableTypes';
import { COLUMN_NAME_REGEX, MAX_COLUMN_NAME_LENGTH } from '@/features/core/dataTable/constants';
import { useDebounce } from '@n8n/composables/useDebounce';
import { nanoid } from 'nanoid';

import {
	N8nButton,
	N8nColorPicker,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
type FormError = {
	message?: string;
	description?: string;
};

const props = withDefaults(
	defineProps<{
		// the params key is needed so that we can pass this directly to ag-grid as column
		params: {
			onAddColumn: (column: DataTableColumnCreatePayload) => Promise<AddColumnResponse>;
			disabled?: boolean;
		};
		popoverId?: string;
		useTextTrigger?: boolean;
		disabled?: boolean;
	}>(),
	{
		disabled: false,
	},
);

// Use disabled from params if available (when used as AG Grid header), otherwise use prop
const isDisabled = computed(() => props.params?.disabled ?? props.disabled);

const i18n = useI18n();
const { getIconForType } = useDataTableTypes();
const { debounce } = useDebounce();

const nameInputRef = ref<HTMLInputElement | null>(null);

const columnName = ref('');
const columnType = ref<DataTableColumnType>('string');
const enumOptions = ref<DataTableEnumOption[]>([]);
const enumOptionInput = ref('');
const enumDefaultValue = ref<string | null>(null);

const columnTypes: DataTableColumnType[] = [...DATA_TABLE_COLUMN_TYPES];

const error = ref<FormError | null>(null);
const enumOptionsValid = computed(() => {
	if (columnType.value !== 'enum') return true;
	if (enumOptions.value.length < 1 || enumOptions.value.length > 100) return false;
	if (enumOptions.value.some((option) => !option.text.trim() || option.text.trim().length > 128))
		return false;
	return (
		new Set(enumOptions.value.map((option) => option.text.trim().toLowerCase())).size ===
		enumOptions.value.length
	);
});
const selectedDefaultOption = computed(() =>
	enumOptions.value.find((option) => option.id === enumDefaultValue.value),
);
const canSubmit = computed(() =>
	Boolean(
		columnName.value &&
			columnType.value &&
			!error.value &&
			enumOptionsValid.value,
	),
);

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
	if (!canSubmit.value) {
		return;
	}
	const response = await props.params.onAddColumn({
		name: columnName.value,
		type: columnType.value,
		...(columnType.value === 'enum'
			? {
					options: enumOptions.value,
					...(enumDefaultValue.value ? { defaultValue: enumDefaultValue.value } : {}),
				}
			: {}),
	});

	if (!response.success) {
		let errorMessage = i18n.baseText('dataTable.addColumn.error');
		let errorDescription = response.errorMessage;
		// Provide custom error message for conflict (column already exists)
		if (response.httpStatus === 409) {
			errorMessage = i18n.baseText('dataTable.column.alreadyExistsError', {
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
	enumOptions.value = [];
	enumOptionInput.value = '';
	enumDefaultValue.value = null;
	popoverOpen.value = false;
};

const handlePopoverOpenChange = async (open: boolean) => {
	// Don't close the popover if the select is open
	if (!open && isSelectOpen.value) {
		return;
	}
	popoverOpen.value = open;
	// Reset error state and focus name input when opening popover
	if (open) {
		error.value = null;
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

const addEnumOption = () => {
	const text = enumOptionInput.value.trim();
	if (
		!text ||
		enumOptions.value.some((option) => option.text.toLowerCase() === text.toLowerCase()) ||
		enumOptions.value.length >= 100
	) {
		return;
	}
	enumOptions.value.push({
		id: nanoid(),
		text,
		color: getDefaultDataTableEnumColor(enumOptions.value.length),
	});
	enumOptionInput.value = '';
};

const removeEnumOption = (optionId: string) => {
	enumOptions.value = enumOptions.value.filter((option) => option.id !== optionId);
	if (enumDefaultValue.value === optionId) enumDefaultValue.value = null;
};

watch(columnType, (type) => {
	if (type !== 'enum') {
		enumOptions.value = [];
		enumOptionInput.value = '';
		enumDefaultValue.value = null;
	}
});

watch(
	enumOptions,
	(options) => {
		if (enumDefaultValue.value && !options.some((option) => option.id === enumDefaultValue.value)) {
			enumDefaultValue.value = null;
		}
	},
	{ deep: true },
);
</script>

<template>
	<N8nTooltip :disabled="popoverOpen" :content="i18n.baseText('dataTable.addColumn.label')">
		<div class="add-column-header-component-wrapper">
			<N8nPopover
				:id="popoverId"
				:open="popoverOpen"
				:popper-options="{ strategy: 'fixed' }"
				:show-arrow="false"
				@update:open="handlePopoverOpenChange"
			>
				<template #trigger>
					<template v-if="props.useTextTrigger">
						<N8nButton
							variant="subtle"
							data-test-id="data-table-add-column-trigger-button"
							:disabled="isDisabled"
						>
							{{ i18n.baseText('dataTable.addColumn.label') }}
						</N8nButton>
					</template>
					<template v-else>
						<N8nIconButton
							variant="ghost"
							data-test-id="data-table-add-column-trigger-button"
							icon="plus"
							:aria-label="i18n.baseText('dataTable.addColumn.label')"
							:disabled="isDisabled"
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
							<N8nInputLabel
								v-if="columnType === 'enum'"
								:label="i18n.baseText('dataTable.addColumn.enumOptions.label')"
								:required="true"
							>
								<div class="enum-option-creator">
									<N8nInput
										v-model="enumOptionInput"
										:placeholder="i18n.baseText('dataTable.addColumn.enumOptions.placeholder')"
										data-test-id="add-column-enum-options-input"
										@keyup.enter.prevent="addEnumOption"
									/>
									<N8nIconButton
										icon="plus"
										type="button"
										:aria-label="i18n.baseText('dataTable.addColumn.enumOptions.add')"
										:disabled="!enumOptionInput.trim() || enumOptions.length >= 100"
										data-test-id="add-column-enum-option-add"
										@click="addEnumOption"
									/>
								</div>
								<div v-if="enumOptions.length" class="enum-option-list">
									<div v-for="option in enumOptions" :key="option.id" class="enum-option-row">
										<N8nInput
											v-model="option.text"
											size="small"
											:maxlength="128"
											:aria-label="i18n.baseText('dataTable.addColumn.enumOptions.name')"
										/>
										<N8nColorPicker
											v-model="option.color"
											size="small"
											:show-input="false"
											:teleported="false"
											:aria-label="i18n.baseText('dataTable.addColumn.enumOptions.color')"
											@click.stop
										/>
										<N8nIconButton
											icon="x"
											size="small"
											variant="ghost"
											type="button"
											:aria-label="i18n.baseText('dataTable.addColumn.enumOptions.remove')"
											@click="removeEnumOption(option.id)"
										/>
									</div>
								</div>
								<N8nText
									v-if="enumOptions.length > 0 && !enumOptionsValid"
									size="small"
									color="danger"
								>
									{{ i18n.baseText('dataTable.addColumn.enumOptions.invalid') }}
								</N8nText>
							</N8nInputLabel>
							<N8nInputLabel
								v-if="columnType === 'enum'"
								:label="i18n.baseText('dataTable.addColumn.enumDefaultValue.label')"
								:required="true"
							>
								<N8nSelect
									v-model="enumDefaultValue"
									:append-to="`#${popoverId}`"
									:placeholder="i18n.baseText('dataTable.addColumn.enumDefaultValue.placeholder')"
									data-test-id="add-column-enum-default-select"
									@visible-change="isSelectOpen = $event"
								>
									<template v-if="selectedDefaultOption" #prefix>
										<span
											class="enum-option-swatch"
											:style="{ backgroundColor: selectedDefaultOption.color }"
										/>
									</template>
									<N8nOption
										v-for="option in enumOptions"
										:key="option.id"
										:label="option.text"
										:value="option.id"
									>
										<div class="enum-option-select-item">
											<span class="enum-option-swatch" :style="{ backgroundColor: option.color }" />
											<span>{{ option.text }}</span>
										</div>
									</N8nOption>
								</N8nSelect>
							</N8nInputLabel>
							<N8nButton
								variant="solid"
								data-test-id="data-table-add-column-submit-button"
								class="mt-m"
								size="large"
								:disabled="!canSubmit"
								@click="onAddButtonClicked"
							>
								{{ i18n.baseText('dataTable.addColumn.label') }}
							</N8nButton>
						</div>
					</div>
				</template>
			</N8nPopover>
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
.enum-option-creator,
.enum-option-row,
.enum-option-select-item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.enum-option-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--2xs);
}
.enum-option-row {
	:global(.n8n-input) {
		flex: 1;
	}
}
.enum-option-swatch {
	flex: 0 0 var(--spacing--2xs);
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--round);
}
</style>
