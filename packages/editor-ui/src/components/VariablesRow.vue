<script lang="ts" setup>
import { computed, onMounted, PropType, ref } from 'vue';
import { EnvironmentVariable } from '@/Interface';
import { useI18n } from '@/composables';

const i18n = useI18n();

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

const modelValue = ref<EnvironmentVariable>(props.data);

const formValid = computed(() => {
	return modelValue.value.key !== '';
});

const keyInputRef = ref<HTMLElement>();
const valueInputRef = ref<HTMLElement>();

onMounted(() => {
	keyInputRef.value?.focus();
});

async function onCancel() {
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
</script>

<template>
	<tr :class="$style.variablesRow">
		<td>
			<span v-if="!editing">{{ data.key }}</span>
			<n8n-input
				v-else
				data-testid="variable-row-key-input"
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
				data-testid="variable-row-value-input"
				:placeholder="i18n.baseText('variables.editing.value.placeholder')"
				v-model="modelValue.value"
				ref="valueInputRef"
			/>
		</td>
		<td class="text-right">
			<div v-if="editing">
				<n8n-button
					data-testid="variable-row-cancel-button"
					type="tertiary"
					class="mr-xs"
					@click="onCancel"
				>
					{{ i18n.baseText('variables.row.button.cancel') }}
				</n8n-button>
				<n8n-button
					data-testid="variable-row-save-button"
					:disabled="!formValid"
					type="primary"
					@click="onSave"
				>
					{{ i18n.baseText('variables.row.button.save') }}
				</n8n-button>
			</div>
			<div :class="$style.hoverButtons" v-else>
				<n8n-button
					data-testid="variable-row-edit-button"
					type="tertiary"
					class="mr-xs"
					@click="onEdit"
				>
					{{ i18n.baseText('variables.row.button.edit') }}
				</n8n-button>
				<n8n-button
					data-testid="variable-row-delete-button"
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

.hoverButtons {
	opacity: 0;
	transition: opacity 0.2s ease;
}
</style>
