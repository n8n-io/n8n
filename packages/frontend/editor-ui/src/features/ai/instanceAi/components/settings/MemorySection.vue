<script lang="ts" setup>
import { N8nHeading, N8nInput, N8nInputNumber, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString, getNumber } = useSettingsField();
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.memory') }}
		</N8nHeading>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.lastMessages.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:class="$style.numberInput"
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
				:class="$style.numberInput"
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

.numberInput {
	max-width: 140px;
}
</style>
