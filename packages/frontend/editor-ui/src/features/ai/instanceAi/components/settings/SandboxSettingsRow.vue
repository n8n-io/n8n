<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nSettingsRow, N8nSettingsRowConfigure, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useInstanceAiConfiguration } from '../../composables/useInstanceAiConfiguration';
import { SANDBOX_PROVIDER_LABELS } from '../../constants';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ configure: []; enable: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const { sandboxCredentialId, sandboxConfigured } = useInstanceAiConfiguration();

const isEnvironmentManaged = computed(
	() =>
		!store.isProxyEnabled &&
		!store.isCloudManaged &&
		(store.settings?.sandboxEnvConfigured ?? false),
);
const sandboxValue = computed(() => {
	if (isEnvironmentManaged.value) return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (sandboxCredentialId.value) {
		return store.settings?.sandboxProvider === 'daytona'
			? SANDBOX_PROVIDER_LABELS.daytona
			: SANDBOX_PROVIDER_LABELS['n8n-sandbox'];
	}
	return i18n.baseText('settings.n8nAgent.sandbox.env.value');
});
const sandboxDescription = computed<{ key: BaseTextKey; warning: boolean }>(() => {
	if (isEnvironmentManaged.value)
		return { key: 'settings.n8nAgent.sandbox.env.description', warning: false };
	if (sandboxCredentialId.value)
		return { key: 'settings.n8nAgent.sandbox.set.description', warning: false };
	return { key: 'settings.n8nAgent.sandbox.missing.description', warning: !props.disabled };
});
</script>

<template>
	<N8nSettingsRow
		:title="i18n.baseText('settings.n8nAgent.sandbox.label')"
		:clickable="!disabled && sandboxConfigured && !isEnvironmentManaged"
		data-test-id="n8n-agent-sandbox-row"
		@click="emit('configure')"
	>
		<template #info>
			<N8nText bold size="medium" color="text-dark">
				{{ i18n.baseText('settings.n8nAgent.sandbox.label') }}
			</N8nText>
			<N8nText size="small" :color="sandboxDescription.warning ? 'warning' : 'text-light'">
				{{ i18n.baseText(sandboxDescription.key) }}
			</N8nText>
		</template>
		<template v-if="!disabled" #action>
			<N8nButton
				v-if="isEnvironmentManaged && !sandboxConfigured"
				variant="solid"
				size="medium"
				:label="i18n.baseText('settings.n8nAgent.sandbox.enable')"
				:disabled="store.isSaving"
				data-test-id="n8n-agent-sandbox-enable"
				@click="emit('enable')"
			/>
			<N8nText
				v-else-if="isEnvironmentManaged"
				size="small"
				color="text-light"
				data-test-id="n8n-agent-sandbox-env-value"
			>
				{{ sandboxValue }}
			</N8nText>
			<N8nButton
				v-else-if="!sandboxConfigured"
				variant="solid"
				size="medium"
				:label="i18n.baseText('settings.n8nAgent.sandbox.add')"
				:disabled="store.isSaving"
				data-test-id="n8n-agent-sandbox-add"
				@click="emit('configure')"
			/>
			<N8nSettingsRowConfigure v-else :value="sandboxValue" />
		</template>
	</N8nSettingsRow>
</template>
