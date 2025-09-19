<script lang="ts" setup>
import type { ExternalSecretsProvider } from '@/Interface';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';

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

async function onUpdateConnected(value: boolean) {
	try {
		saving.value = true;

		if (props.beforeUpdate) {
			const result = await props.beforeUpdate(value);
			if (!result) {
				saving.value = false;
				return;
			}
		}

		await externalSecretsStore.updateProviderConnected(props.provider.name, value);

		emit('change', value);
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div v-loading="saving" class="connection-switch">
		<n8n-icon
			v-if="provider.state === 'error'"
			color="danger"
			icon="triangle-alert"
			class="mr-2xs"
		/>
		<n8n-text :color="connectedTextColor" bold class="mr-2xs">
			{{
				i18n.baseText(
					`settings.externalSecrets.card.${provider.connected ? 'connected' : 'disconnected'}`,
				)
			}}
		</n8n-text>
		<el-switch
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
		</el-switch>
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
