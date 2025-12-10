<script setup lang="ts">
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { type ChatModelDto, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { computed } from 'vue';
import { isLlmProviderModel } from '../chat.utils';

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
		<span v-if="agent?.icon?.type === 'emoji'" :class="[$style.emoji, $style[size]]">
			{{ agent.icon.value }}
		</span>
		<N8nIcon
			v-else-if="!agent || !isLlmProviderModel(agent.model)"
			color="text-light"
			:class="$style.n8nIcon"
			:icon="agent ? ((agent.icon?.value ?? 'bot') as IconName) : 'messages-square'"
			:size="size === 'lg' ? 'xxlarge' : size === 'sm' ? 'large' : 'xlarge'"
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
.n8nIcon {
	outline: none;
}

.emoji {
	display: inline-flex;
	align-items: center;
	justify-content: center;

	&.sm {
		width: 16px;
		height: 16px;
	}

	&.md {
		width: 20px;
		height: 20px;
		font-size: 20px;
	}

	&.lg {
		width: 40px;
		height: 40px;
		font-size: 28px;
	}
}

.credentialsIcon {
	visibility: hidden;

	&.isReady {
		visibility: visible;
	}
}
</style>
