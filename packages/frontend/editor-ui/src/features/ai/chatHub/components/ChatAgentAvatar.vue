<script setup lang="ts">
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { type ChatModelDto, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { N8nAvatar, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

defineProps<{
	agent: ChatModelDto | null;
	size: 'sm' | 'md' | 'lg';
	tooltip?: boolean;
}>();

const credentialsStore = useCredentialsStore();
const isCredentialsIconReady = computed(() => credentialsStore.allCredentialTypes.length > 0);
</script>

<template>
	<N8nTooltip :show-after="100" placement="left" :disabled="!tooltip">
		<template v-if="agent" #content>{{ agent.name }}</template>
		<N8nIcon
			v-if="!agent"
			icon="messages-square"
			:size="size === 'lg' ? 'xxlarge' : size === 'sm' ? 'large' : 'xlarge'"
		/>
		<N8nAvatar
			v-else-if="agent.model.provider === 'custom-agent' || agent.model.provider === 'n8n'"
			:class="[$style.avatar, $style[size]]"
			:first-name="agent.name"
			:size="size === 'lg' ? 'medium' : size === 'sm' ? 'xxsmall' : 'xsmall'"
		/>
		<CredentialIcon
			v-else
			:class="[$style.credentialsIcon, { [$style.isReady]: isCredentialsIconReady }]"
			:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[agent.model.provider]"
			:size="size === 'sm' ? 16 : size === 'lg' ? 40 : 20"
		/>
	</N8nTooltip>
</template>

<style lang="scss" module>
.avatar.md {
	transform: scale(1.2);
}

.credentialsIcon {
	visibility: hidden;

	&.isReady {
		visibility: visible;
	}
}
</style>
