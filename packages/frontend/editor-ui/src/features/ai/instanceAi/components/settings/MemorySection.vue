<script lang="ts" setup>
import { N8nHeading, N8nInputNumber, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getNumber } = useSettingsField();
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
