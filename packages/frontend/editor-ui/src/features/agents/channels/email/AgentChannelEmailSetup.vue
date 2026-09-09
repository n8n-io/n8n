<script setup lang="ts">
import { N8nButton, N8nCopyInput, N8nHeading, N8nNotice, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { AgentChannelViewProps } from '../types';
import { isEmailChannelRuntime } from './useEmailChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{ connected: [] }>();

const i18n = useI18n();
const provisionedAddress = ref('');
const setupError = ref('');
const loading = computed(() => props.loading || props.runtime.loading.value);
const address = computed(
	() =>
		provisionedAddress.value ||
		props.credentials.find((credential) => credential.id === credentialId.value)?.name ||
		'',
);

async function createAddress() {
	if (!isEmailChannelRuntime(props.runtime)) return;
	setupError.value = '';
	try {
		const channel = await props.runtime.provision();
		credentialId.value = channel.credentialId;
		provisionedAddress.value = channel.address;
	} catch (error) {
		setupError.value = error instanceof Error ? error.message : String(error);
	}
}

defineExpose({ loading });
</script>

<template>
	<div :class="$style.container">
		<N8nHeading tag="h3" size="medium">
			{{ i18n.baseText('agents.channels.email.setup.title') }}
		</N8nHeading>
		<N8nText color="text-light">
			{{ i18n.baseText('agents.channels.email.setup.description') }}
		</N8nText>

		<N8nButton
			v-if="!address"
			:loading="loading"
			:disabled="disabled || loading"
			data-testid="agent-email-create-address"
			@click="createAddress"
		>
			{{ i18n.baseText('agents.channels.email.setup.create') }}
		</N8nButton>

		<template v-else>
			<N8nCopyInput
				:value="address"
				:copy-label="i18n.baseText('generic.clickToCopy')"
				:copied-label="i18n.baseText('generic.copiedToClipboard')"
				data-testid="agent-email-address"
			/>
			<N8nNotice
				theme="warning"
				:content="i18n.baseText('agents.channels.email.openAddressWarning')"
			/>
			<N8nText v-if="!isPublished" color="text-light" size="small">
				{{ i18n.baseText('agents.channels.email.publishGuidance') }}
			</N8nText>
			<N8nButton data-testid="agent-email-setup-done" @click="emit('connected')">
				{{ i18n.baseText('agents.channels.email.setup.done') }}
			</N8nButton>
		</template>

		<N8nText v-if="setupError" color="danger" size="small">{{ setupError }}</N8nText>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.container > * {
	width: 100%;
}
</style>
