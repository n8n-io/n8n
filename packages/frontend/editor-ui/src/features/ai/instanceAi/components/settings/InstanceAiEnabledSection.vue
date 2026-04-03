<script lang="ts" setup>
import { N8nHeading, N8nText } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getBool } = useSettingsField();

async function onInstanceAiEnabledChange(value: string | number | boolean) {
	const enabled = Boolean(value);
	store.setField('instanceAiEnabled', enabled);
	await store.persistInstanceAiEnabled(enabled);
}
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.instanceAiEnabled.label')
			}}</span>
			<ElSwitch
				:model-value="getBool('instanceAiEnabled')"
				:disabled="store.isSaving"
				data-test-id="instance-ai-settings-instance-ai-enabled"
				@update:model-value="onInstanceAiEnabledChange"
			/>
		</div>
		<N8nText size="small" color="text-light" :class="$style.hint">
			{{ i18n.baseText('instanceAi.settings.instanceAiEnabled.description') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.hint {
	max-width: 720px;
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	margin-top: var(--spacing--xs);
	max-width: 720px;
}

.switchLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}
</style>
