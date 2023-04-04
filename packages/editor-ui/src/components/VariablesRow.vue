<script lang="ts" setup>
import { computed, onMounted, PropType, ref } from 'vue';
import { EnvironmentVariable } from '@/Interface';
import { useI18n, useToast, useCopyToClipboard } from '@/composables';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores';

const i18n = useI18n();
const copyToClipboard = useCopyToClipboard();
const { showMessage } = useToast();
const settingsStore = useSettingsStore();

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

const modelValue = ref<EnvironmentVariable>({ ...props.data });

const formValid = computed(() => {
	return modelValue.value.key !== '';
});

const keyInputRef = ref<HTMLElement>();
const valueInputRef = ref<HTMLElement>();

const usage = computed(() => `$vars.${props.data.key}`);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
);

onMounted(() => {
	keyInputRef.value?.focus();
});

async function onCancel() {
	modelValue.value = { ...props.data };
	emit('cancel', modelValue.value);
}

async function onSave() {
	emit('save', modelValue.value);
}

async function onEdit() {
	emit('edit', modelValue.value);
}

async function onDelete() {
	emit('delete', modelValue.value);
}

function onUsageClick() {
	copyToClipboard(usage.value);
	showMessage({
		title: i18n.baseText('variables.row.usage.copiedToClipboard'),
		type: 'success',
	});
}
</script>

<template>
	<tr :class="$style.variablesRow">
		<td>
			<span v-if="!editing">{{ data.key }}</span>
			<n8n-input
				v-else
				data-test-id="variable-row-key-input"
				:required="true"
				:placeholder="i18n.baseText('variables.editing.key.placeholder')"
				v-model="modelValue.key"
				ref="keyInputRef"
			/>
		</td>
		<td>
			<span v-if="!editing">{{ data.value }}</span>
			<n8n-input
				v-else
				data-test-id="variable-row-value-input"
				:placeholder="i18n.baseText('variables.editing.value.placeholder')"
				v-model="modelValue.value"
				ref="valueInputRef"
			/>
		</td>
		<td class="variables-usage-column">
			<n8n-tooltip placement="top">
				<span v-if="data.key" :class="$style.usageSyntax" @click="onUsageClick">{{ usage }}</span>
				<template #content>
					{{ i18n.baseText('variables.row.usage.copyToClipboard') }}
				</template>
			</n8n-tooltip>
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
				<n8n-button
					data-test-id="variable-row-edit-button"
					type="tertiary"
					class="mr-xs"
					@click="onEdit"
				>
					{{ i18n.baseText('variables.row.button.edit') }}
				</n8n-button>
				<n8n-button
					data-test-id="variable-row-delete-button"
					type="tertiary"
					class="mr-xs"
					@click="onDelete"
				>
					{{ i18n.baseText('variables.row.button.delete') }}
				</n8n-button>
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
