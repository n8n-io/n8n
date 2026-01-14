<script setup lang="ts">
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { type ChatModelDto, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { computed } from 'vue';
import {
	isLlmProviderModel,
	personalAgentDefaultIcon,
	workflowAgentDefaultIcon,
} from '../chat.utils';
import { useI18n } from '@n8n/i18n';

defineProps<{
	agent: ChatModelDto | null;
	size: 'sm' | 'md' | 'lg';
	tooltip?: boolean;
}>();

const credentialsStore = useCredentialsStore();
const isCredentialsIconReady = computed(() => credentialsStore.allCredentialTypes.length > 0);
const i18n = useI18n();
</script>

<template>
	<N8nTooltip :show-after="100" placement="left" :disabled="!tooltip">
		<template #content>{{
			agent?.name || i18n.baseText('chatHub.agent.unavailableAgent')
		}}</template>
		<div :class="[$style.container, $attrs.class]">
			<span v-if="agent?.icon?.type === 'emoji'" :class="[$style.emoji, $style[size]]">
				{{ agent.icon.value }}
			</span>
			<N8nIcon
				v-else-if="!agent || !isLlmProviderModel(agent.model)"
				:color="size === 'sm' ? 'text-base' : 'text-light'"
				:class="[$style.n8nIcon, $style[size]]"
				:icon="
					(agent?.icon?.value ??
						(agent?.model.provider === 'n8n' ? workflowAgentDefaultIcon : personalAgentDefaultIcon)
							.value) as IconName
				"
				:size="size === 'lg' ? 'xxlarge' : size === 'sm' ? 'large' : 'xlarge'"
			/>
			<CredentialIcon
				v-else
				:class="[$style.credentialsIcon, { [$style.isReady]: isCredentialsIconReady }]"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[agent.model.provider]"
				:size="size === 'sm' ? 16 : size === 'lg' ? 40 : 20"
			/>
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}

.n8nIcon {
	outline: none;

	&.lg {
		width: 24px;
		height: 24px;

		& g,
		& path {
			stroke-width: 1.25;
		}
	}
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
		width: 24px;
		height: 24px;
		font-size: 24px;
	}
}

.credentialsIcon {
	visibility: hidden;

	&.isReady {
		visibility: visible;
	}
}
</style>
