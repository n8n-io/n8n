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
			{{ i18n.baseText('instanceAi.settings.section.advanced') }}
		</N8nHeading>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.subAgentMaxSteps.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:class="$style.numberInput"
				:model-value="getNumber('subAgentMaxSteps') ?? 100"
				size="small"
				:min="1"
				@update:model-value="store.setField('subAgentMaxSteps', $event ?? 100)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.mcpServers.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('mcpServers')"
				size="small"
				type="textarea"
				:rows="3"
				:placeholder="i18n.baseText('instanceAi.settings.mcpServers.placeholder')"
				@update:model-value="store.setField('mcpServers', $event)"
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
