<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nInput, N8nSelect, N8nOption, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString } = useSettingsField();

const selectedCredentialId = computed(() => {
	if (store.draft.credentialId !== undefined) return store.draft.credentialId ?? '';
	return store.settings?.credentialId ?? '';
});

function handleCredentialChange(value: string | number | boolean | null) {
	store.setField('credentialId', value ? String(value) : null);
}
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="robot" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.model') }}
		</div>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.credential.label')"
			:bold="false"
			size="small"
		>
			<N8nSelect
				:model-value="selectedCredentialId"
				size="small"
				:placeholder="i18n.baseText('instanceAi.settings.credential.placeholder')"
				@update:model-value="handleCredentialChange"
			>
				<N8nOption value="" :label="i18n.baseText('instanceAi.settings.credential.none')" />
				<N8nOption
					v-for="cred in store.credentials"
					:key="cred.id"
					:value="cred.id"
					:label="`${cred.name} (${cred.provider})`"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.modelName.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('modelName')"
				size="small"
				:placeholder="i18n.baseText('instanceAi.settings.modelName.placeholder')"
				@update:model-value="store.setField('modelName', $event)"
			/>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
}
</style>
