<script lang="ts" setup>
import { computed } from 'vue';
import { N8nHeading, N8nInput, N8nSelect, N8nOption, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getPreferenceString } = useSettingsField();

const selectedCredentialId = computed(() => {
	if (store.preferencesDraft.credentialId !== undefined)
		return store.preferencesDraft.credentialId ?? '';
	return store.preferences?.credentialId ?? '';
});

function handleCredentialChange(value: string | number | boolean | null) {
	store.setPreferenceField('credentialId', value ? String(value) : null);
}
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.model') }}
		</N8nHeading>

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
				:model-value="getPreferenceString('modelName')"
				size="small"
				:placeholder="i18n.baseText('instanceAi.settings.modelName.placeholder')"
				@update:model-value="store.setPreferenceField('modelName', $event)"
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
</style>
