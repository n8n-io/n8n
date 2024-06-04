<script lang="ts" setup>
import type { ComponentPublicInstance, PropType } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Rule, RuleGroup } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useClipboard } from '@/composables/useClipboard';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { getVariablesPermissions } from '@/permissions';
import type { IResource } from './layouts/ResourcesListLayout.vue';

const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const emit = defineEmits(['save', 'cancel', 'edit', 'delete']);

const props = defineProps({
	data: {
		type: Object as PropType<IResource>,
		default: () => ({}),
	},
	editing: {
		type: Boolean,
		default: false,
	},
});

const permissions = computed(() => getVariablesPermissions(usersStore.currentUser));
const modelValue = ref<IResource>({ ...props.data });

const formValidationStatus = ref<Record<string, boolean>>({
	key: false,
	value: false,
});
const formValid = computed(() => {
	return formValidationStatus.value.name && formValidationStatus.value.value;
});

const keyInputRef = ref<ComponentPublicInstance & { inputRef?: HTMLElement }>();
const valueInputRef = ref<HTMLElement>();

const usage = ref(`$vars.${props.data.name}`);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
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
	() => modelValue.value.name,
	async () => {
		await nextTick();
		if (formValidationStatus.value.name) {
			updateUsageSyntax();
		}
	},
);

function updateUsageSyntax() {
	usage.value = `$vars.${modelValue.value.name || props.data.name}`;
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

function onValidate(name: string, value: boolean) {
	formValidationStatus.value[name] = value;
}

function onUsageClick() {
	void clipboard.copy(usage.value);
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
	<tr :class="$style.variablesRow" data-test-id="variables-row">
		<td class="variables-key-column">
			<div>
				<span v-if="!editing">{{ data.name }}</span>
				<n8n-form-input
					v-else
					ref="keyInputRef"
					v-model="modelValue.name"
					label
					name="name"
					data-test-id="variable-row-key-input"
					:placeholder="i18n.baseText('variables.editing.key.placeholder')"
					required
					validate-on-blur
					:validation-rules="keyValidationRules"
					@validate="(value: boolean) => onValidate('name', value)"
				/>
			</div>
		</td>
		<td class="variables-value-column">
			<div>
				<span v-if="!editing">{{ data.value }}</span>
				<n8n-form-input
					v-else
					ref="valueInputRef"
					v-model="modelValue.value"
					label
					name="value"
					data-test-id="variable-row-value-input"
					:placeholder="i18n.baseText('variables.editing.value.placeholder')"
					validate-on-blur
					:validation-rules="valueValidationRules"
					@validate="(value: boolean) => onValidate('value', value)"
				/>
			</div>
		</td>
		<td class="variables-usage-column">
			<div>
				<n8n-tooltip placement="top">
					<span v-if="modelValue.name && usage" :class="$style.usageSyntax" @click="onUsageClick">{{
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
				<n8n-tooltip :disabled="permissions.update" placement="top">
					<div>
						<n8n-button
							data-test-id="variable-row-edit-button"
							type="tertiary"
							class="mr-xs"
							:disabled="!permissions.update"
							@click="onEdit"
						>
							{{ i18n.baseText('variables.row.button.edit') }}
						</n8n-button>
					</div>
					<template #content>
						{{ i18n.baseText('variables.row.button.edit.onlyRoleCanEdit') }}
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
						{{ i18n.baseText('variables.row.button.delete.onlyRoleCanDelete') }}
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
	background: var(--color-variables-usage-syntax-bg);
	color: var(--color-variables-usage-font);
	font-family: var(--font-family-monospace);
	font-size: var(--font-size-s);
}
</style>
