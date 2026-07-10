<script lang="ts" setup>
import { N8nHeading, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString } = useSettingsField();
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.advanced') }}
		</N8nHeading>

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
</style>
