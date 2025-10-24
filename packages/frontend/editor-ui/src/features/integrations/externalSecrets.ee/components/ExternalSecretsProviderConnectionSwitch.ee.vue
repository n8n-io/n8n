<script lang="ts" setup>
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import { useExternalSecretsStore } from '../externalSecrets.ee.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';

import { ElSwitch } from 'element-plus';
import { N8nIcon, N8nText } from '@n8n/design-system';
const emit = defineEmits<{
	change: [value: boolean];
}>();

const props = withDefaults(
	defineProps<{
		provider: ExternalSecretsProvider;
		eventBus?: EventBus;
		disabled?: boolean;
		beforeUpdate?: (value: boolean) => Promise<boolean>;
	}>(),
	{
		eventBus: undefined,
		disabled: false,
		beforeUpdate: undefined,
	},
);

const externalSecretsStore = useExternalSecretsStore();
const i18n = useI18n();
const toast = useToast();

const saving = ref(false);

const connectedTextColor = computed(() => {
	return props.provider.connected ? 'success' : 'text-light';
});

onMounted(() => {
	if (props.eventBus) {
		props.eventBus.on('connect', onUpdateConnected);
	}
});

async function onUpdateConnected(value: string | number | boolean) {
	const boolValue = typeof value === 'boolean' ? value : Boolean(value);
	try {
		saving.value = true;

		if (props.beforeUpdate) {
			const result = await props.beforeUpdate(boolValue);
			if (!result) {
				saving.value = false;
				return;
			}
		}

		await externalSecretsStore.updateProviderConnected(props.provider.name, boolValue);

		emit('change', boolValue);
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div v-loading="saving" class="connection-switch">
		<N8nIcon
			v-if="provider.state === 'error'"
			color="danger"
			icon="triangle-alert"
			class="mr-2xs"
		/>
		<N8nText :color="connectedTextColor" bold class="mr-2xs">
			{{
				i18n.baseText(
					`settings.externalSecrets.card.${provider.connected ? 'connected' : 'disconnected'}`,
				)
			}}
		</N8nText>
		<ElSwitch
			:model-value="provider.connected"
			:title="
				i18n.baseText('settings.externalSecrets.card.connectedSwitch.title', {
					interpolate: { provider: provider.displayName },
				})
			"
			:disabled="disabled"
			data-test-id="settings-external-secrets-connected-switch"
			@update:model-value="onUpdateConnected"
		>
		</ElSwitch>
	</div>
</template>

<style lang="scss" scoped>
.connection-switch {
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: center;

	&.error {
		:deep(.el-switch.is-checked .el-switch__core) {
			background-color: #ff4027;
			border-color: #ff4027;
		}
	}
}
</style>
