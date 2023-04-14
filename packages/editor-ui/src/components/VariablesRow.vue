<script lang="ts" setup>
import { ComponentPublicInstance, computed, nextTick, onMounted, PropType, ref, watch } from 'vue';
import { EnvironmentVariable, IValidator, Rule, RuleGroup, Validatable } from '@/Interface';
import { useI18n, useToast, useCopyToClipboard } from '@/composables';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore, useUsersStore } from '@/stores';
import { getVariablesPermissions } from '@/permissions';

const i18n = useI18n();
const copyToClipboard = useCopyToClipboard();
const { showMessage } = useToast();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const emit = defineEmits(['save', 'cancel', 'edit', 'delete']);

const props = defineProps({
	data: {
		type: Object as PropType<EnvironmentVariable>,
		default: () => ({}),
	},
	editing: {
		type: Boolean,
		default: false,
	},
});

const permissions = getVariablesPermissions(usersStore.currentUser);
const modelValue = ref<EnvironmentVariable>({ ...props.data });

const formValidationStatus = ref<Record<string, boolean>>({
	key: false,
	value: false,
});
const formValid = computed(() => {
	return formValidationStatus.value.key && formValidationStatus.value.value;
});

const keyInputRef = ref<ComponentPublicInstance & { inputRef?: HTMLElement }>();
const valueInputRef = ref<HTMLElement>();

const usage = ref(`$vars.${props.data.key}`);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
);

const showActions = computed(
	() => isFeatureEnabled.value && (permissions.edit || permissions.delete),
);

onMounted(() => {
	focusFirstInput();
});

const keyValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'REQUIRED' },
	{ name: 'MAX_LENGTH', config: { maximum: 50 } },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^[a-zA-Z]/,
			message: i18n.baseText('variables.editing.key.error.startsWithLetter'),
		},
	},
	{
		name: 'MATCH_REGEX',
		config: {
			regex: /^[a-zA-Z][a-zA-Z0-9_]*$/,
			message: i18n.baseText('variables.editing.key.error.jsonKey'),
		},
	},
];

const valueValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 220 } },
];

watch(
	() => modelValue.value.key,
	() => {
		nextTick(() => {
			if (formValidationStatus.value.key) {
				updateUsageSyntax();
			}
		});
	},
);

function updateUsageSyntax() {
	usage.value = `$vars.${modelValue.value.key || props.data.key}`;
}

async function onCancel() {
	modelValue.value = { ...props.data };
	emit('cancel', modelValue.value);
}

async function onSave() {
	emit('save', modelValue.value);
}

async function onEdit() {
	emit('edit', modelValue.value);

	await nextTick();

	focusFirstInput();
}

async function onDelete() {
	emit('delete', modelValue.value);
}

function onValidate(key: string, value: boolean) {
	formValidationStatus.value[key] = value;
}

function onUsageClick() {
	copyToClipboard(usage.value);
	showMessage({
		title: i18n.baseText('variables.row.usage.copiedToClipboard'),
		type: 'success',
	});
}

function focusFirstInput() {
	keyInputRef.value?.inputRef?.focus?.();
}
</script>

<template>
	<tr :class="$style.variablesRow">
		<td class="variables-key-column">
			<div>
				<span v-if="!editing">{{ data.key }}</span>
				<n8n-form-input
					v-else
					label
					name="key"
					data-test-id="variable-row-key-input"
					:placeholder="i18n.baseText('variables.editing.key.placeholder')"
					required
					validateOnBlur
					:validationRules="keyValidationRules"
					v-model="modelValue.key"
					ref="keyInputRef"
					@validate="(value) => onValidate('key', value)"
				/>
			</div>
		</td>
		<td class="variables-value-column">
			<div>
				<span v-if="!editing">{{ data.value }}</span>
				<n8n-form-input
					v-else
					label
					name="value"
					data-test-id="variable-row-value-input"
					:placeholder="i18n.baseText('variables.editing.value.placeholder')"
					validateOnBlur
					:validationRules="valueValidationRules"
					v-model="modelValue.value"
					ref="valueInputRef"
					@validate="(value) => onValidate('value', value)"
				/>
			</div>
		</td>
		<td class="variables-usage-column">
			<div>
				<n8n-tooltip placement="top">
					<span v-if="modelValue.key && usage" :class="$style.usageSyntax" @click="onUsageClick">{{
						usage
					}}</span>
					<template #content>
						{{ i18n.baseText('variables.row.usage.copyToClipboard') }}
					</template>
				</n8n-tooltip>
			</div>
		</td>
		<td v-if="isFeatureEnabled">
			<div v-if="editing" :class="$style.buttons">
				<n8n-button
					data-test-id="variable-row-cancel-button"
					type="tertiary"
					class="mr-xs"
					@click="onCancel"
				>
					{{ i18n.baseText('variables.row.button.cancel') }}
				</n8n-button>
				<n8n-button
					data-test-id="variable-row-save-button"
					:disabled="!formValid"
					type="primary"
					@click="onSave"
				>
					{{ i18n.baseText('variables.row.button.save') }}
				</n8n-button>
			</div>
			<div v-else :class="[$style.buttons, $style.hoverButtons]">
				<n8n-tooltip :disabled="permissions.edit" placement="top">
					<div>
						<n8n-button
							data-test-id="variable-row-edit-button"
							type="tertiary"
							class="mr-xs"
							:disabled="!permissions.edit"
							@click="onEdit"
						>
							{{ i18n.baseText('variables.row.button.edit') }}
						</n8n-button>
					</div>
					<template #content>
						{{ i18n.baseText('variables.row.button.edit.onlyOwnerCanSave') }}
					</template>
				</n8n-tooltip>
				<n8n-tooltip :disabled="permissions.delete" placement="top">
					<div>
						<n8n-button
							data-test-id="variable-row-delete-button"
							type="tertiary"
							:disabled="!permissions.delete"
							@click="onDelete"
						>
							{{ i18n.baseText('variables.row.button.delete') }}
						</n8n-button>
					</div>
					<template #content>
						{{ i18n.baseText('variables.row.button.delete.onlyOwnerCanDelete') }}
					</template>
				</n8n-tooltip>
			</div>
		</td>
	</tr>
</template>

<style lang="scss" module>
.variablesRow {
	&:hover {
		.hoverButtons {
			opacity: 1;
		}
	}

	td {
		> div {
			display: flex;
			align-items: center;
			min-height: 40px;
		}
	}
}

.buttons {
	display: flex;
	flex-wrap: nowrap;
	justify-content: flex-end;
}

.hoverButtons {
	opacity: 0;
	transition: opacity 0.2s ease;
}

.usageSyntax {
	cursor: pointer;
	background: var(--color-success-tint-2);
	color: var(--color-success);
	font-family: var(--font-family-monospace);
	font-size: var(--font-size-s);
}
</style>
