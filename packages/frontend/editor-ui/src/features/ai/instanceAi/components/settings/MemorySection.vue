<script lang="ts" setup>
import { N8nIcon, N8nInput, N8nInputNumber, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString, getNumber } = useSettingsField();
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="brain" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.memory') }}
		</div>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.lastMessages.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:model-value="getNumber('lastMessages') ?? 20"
				size="small"
				:min="1"
				@update:model-value="store.setField('lastMessages', $event ?? 20)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.embedderModel.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('embedderModel')"
				size="small"
				:placeholder="i18n.baseText('instanceAi.settings.embedderModel.placeholder')"
				@update:model-value="store.setField('embedderModel', $event)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.semanticRecallTopK.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:model-value="getNumber('semanticRecallTopK') ?? 5"
				size="small"
				:min="0"
				@update:model-value="store.setField('semanticRecallTopK', $event ?? 5)"
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
