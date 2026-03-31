<script lang="ts" setup>
import { N8nHeading, N8nInput, N8nInputNumber, N8nInputLabel } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString, getNumber, getBool } = useSettingsField();
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

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.browserMcp.label')
			}}</span>
			<ElSwitch
				:model-value="getBool('browserMcp')"
				@update:model-value="store.setField('browserMcp', Boolean($event))"
			/>
		</div>

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

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
