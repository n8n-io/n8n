<script setup lang="ts">
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

defineProps<{
	showMissingAgentCallout: boolean;
	showMissingCredentialsCallout: boolean;
	showDynamicCredentialsMissingCallout: boolean;
	showCreditsClaimedCallout: boolean;
	isNewSession: boolean;
	llmProvider?: ChatHubLLMProvider;
	aiCreditsQuota: string;
	compact?: boolean;
}>();

const emit = defineEmits<{
	selectModel: [];
	setCredentials: [ChatHubLLMProvider];
	dismissCreditsCallout: [];
	openDynamicCredentials: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nCallout
		v-if="showMissingAgentCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<I18nT
			:keypath="
				isNewSession
					? 'chatHub.chat.prompt.callout.selectModel.new'
					: 'chatHub.chat.prompt.callout.selectModel.existing'
			"
			tag="span"
			scope="global"
		>
			<template #link>
				<a href="" @click.prevent="emit('selectModel')">{{
					i18n.baseText(
						isNewSession
							? 'chatHub.chat.prompt.callout.selectModel.new.link'
							: 'chatHub.chat.prompt.callout.selectModel.existing.link',
					)
				}}</a>
			</template>
		</I18nT>
	</N8nCallout>

	<N8nCallout
		v-else-if="showMissingCredentialsCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<I18nT
			:keypath="
				isNewSession
					? 'chatHub.chat.prompt.callout.setCredentials.new'
					: 'chatHub.chat.prompt.callout.setCredentials.existing'
			"
			tag="span"
			scope="global"
		>
			<template #link>
				<a href="" @click.prevent="emit('setCredentials', llmProvider!)">{{
					i18n.baseText(
						isNewSession
							? 'chatHub.chat.prompt.callout.setCredentials.new.link'
							: 'chatHub.chat.prompt.callout.setCredentials.existing.link',
					)
				}}</a>
			</template>
			<template #provider>
				{{ providerDisplayNames[llmProvider!] }}
			</template>
		</I18nT>
	</N8nCallout>

	<N8nCallout
		v-else-if="showDynamicCredentialsMissingCallout"
		theme="warning"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
		data-testid="dynamic-credentials-missing-callout"
	>
		<N8nText>{{
			i18n.baseText(
				isNewSession
					? 'chatHub.chat.prompt.callout.dynamicCredentials.missing'
					: 'chatHub.chat.prompt.callout.dynamicCredentials.expired',
			)
		}}</N8nText>
		<template #trailingContent>
			<N8nButton
				type="warning"
				native-type="button"
				size="small"
				data-testid="dynamic-credentials-connect-button"
				@click="emit('openDynamicCredentials')"
			>
				{{ i18n.baseText('chatHub.chat.prompt.callout.dynamicCredentials.missing.button') }}
			</N8nButton>
		</template>
	</N8nCallout>

	<N8nCallout
		v-else-if="showCreditsClaimedCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<N8nText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.beginning') }}</N8nText>
		<N8nText bold>{{
			i18n.baseText('freeAi.credits.callout.success.chatHub.credits', {
				interpolate: { amount: aiCreditsQuota },
			})
		}}</N8nText>
		<N8nText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.end') }}</N8nText>

		<template #trailingContent>
			<N8nIcon
				icon="x"
				title="Dismiss"
				size="medium"
				type="secondary"
				@click="emit('dismissCreditsCallout')"
			/>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.callout {
	margin: -1px;
	padding: var(--spacing--sm);
	border-radius: 16px 16px 0 0;
}

.calloutCompact {
	width: 100%;
	box-shadow: 0 10px 24px 0 #00000010;
}
</style>
