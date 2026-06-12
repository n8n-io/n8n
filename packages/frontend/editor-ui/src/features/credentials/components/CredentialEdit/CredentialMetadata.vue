<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { ElCol, ElRow } from 'element-plus';
import type { IDataObject } from 'n8n-workflow';

type Props = {
	modelValue: IDataObject | null;
	readonly?: boolean;
};

const props = withDefaults(defineProps<Props>(), { readonly: false });
const emit = defineEmits<{
	'update:modelValue': [value: IDataObject | null];
}>();

const i18n = useI18n();

const newKey = ref('');
const newValue = ref('');

const entries = computed(() => {
	if (!props.modelValue) return [];
	return Object.entries(props.modelValue).map(([key, value]) => ({
		key,
		value: String(value ?? ''),
	}));
});

function addEntry() {
	const key = newKey.value.trim();
	if (!key) return;

	const updated = { ...(props.modelValue ?? {}), [key]: newValue.value };
	emit('update:modelValue', updated);
	newKey.value = '';
	newValue.value = '';
}

function removeEntry(key: string) {
	if (!props.modelValue) return;
	const { [key]: _, ...rest } = props.modelValue;
	emit('update:modelValue', Object.keys(rest).length > 0 ? rest : null);
}

function updateEntryValue(key: string, value: string) {
	if (!props.modelValue) return;
	emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>

<template>
	<div :class="$style.container">
		<N8nText :compact="true" :bold="true" tag="p" :class="$style.sectionTitle">
			{{ i18n.baseText('credentialEdit.credentialMetadata.title') }}
		</N8nText>
		<N8nText size="small" color="text-light" tag="p" :class="$style.description">
			{{ i18n.baseText('credentialEdit.credentialMetadata.description') }}
		</N8nText>

		<div v-if="entries.length > 0" :class="$style.entries">
			<ElRow v-for="entry in entries" :key="entry.key" :gutter="8" :class="$style.entryRow">
				<ElCol :span="8">
					<N8nInput
						:model-value="entry.key"
						:disabled="true"
						size="small"
						data-test-id="credential-metadata-key"
					/>
				</ElCol>
				<ElCol :span="13">
					<N8nInput
						:model-value="entry.value"
						:disabled="readonly"
						size="small"
						data-test-id="credential-metadata-value"
						@update:model-value="updateEntryValue(entry.key, $event)"
					/>
				</ElCol>
				<ElCol v-if="!readonly" :span="3">
					<N8nIconButton
						icon="trash-2"
						variant="subtle"
						size="small"
						data-test-id="credential-metadata-remove"
						:title="i18n.baseText('credentialEdit.credentialMetadata.remove')"
						@click="removeEntry(entry.key)"
					/>
				</ElCol>
			</ElRow>
		</div>

		<div v-if="!readonly" :class="$style.addRow">
			<ElRow :gutter="8">
				<ElCol :span="8">
					<N8nInput
						v-model="newKey"
						size="small"
						:placeholder="i18n.baseText('credentialEdit.credentialMetadata.keyPlaceholder')"
						data-test-id="credential-metadata-new-key"
						@keydown.enter="addEntry"
					/>
				</ElCol>
				<ElCol :span="13">
					<N8nInput
						v-model="newValue"
						size="small"
						:placeholder="i18n.baseText('credentialEdit.credentialMetadata.valuePlaceholder')"
						data-test-id="credential-metadata-new-value"
						@keydown.enter="addEntry"
					/>
				</ElCol>
				<ElCol :span="3">
					<N8nButton
						size="small"
						variant="secondary"
						icon="plus"
						:disabled="!newKey.trim()"
						data-test-id="credential-metadata-add"
						@click="addEntry"
					/>
				</ElCol>
			</ElRow>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	margin-top: var(--spacing--xl);
}

.sectionTitle {
	margin-bottom: var(--spacing--4xs);
}

.description {
	margin-bottom: var(--spacing--xs);
}

.entries {
	margin-top: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.entryRow {
	margin-bottom: var(--spacing--2xs);
}

.addRow {
	margin-top: var(--spacing--2xs);
}
</style>
