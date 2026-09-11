<script setup lang="ts">
import { N8nBadge, N8nButton, N8nCopyInput, N8nNotice, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { AGENT_EMAIL_INBOX_VIEW } from '../../constants';
import type { AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const i18n = useI18n();
const router = useRouter();

const address = computed(
	() => props.credentials.find((credential) => credential.id === credentialId.value)?.name ?? '',
);

async function openInbox() {
	await router.push({
		name: AGENT_EMAIL_INBOX_VIEW,
		params: { projectId: props.projectId, agentId: props.agentId },
	});
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.status">
			<N8nText bold>{{ i18n.baseText('agents.channels.email.addressLabel') }}</N8nText>
			<N8nBadge :theme="isPublished ? 'success' : 'default'">
				{{
					i18n.baseText(
						isPublished
							? 'agents.channels.email.status.active'
							: 'agents.channels.email.status.configured',
					)
				}}
			</N8nBadge>
		</div>
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
		<N8nButton
			v-if="address"
			variant="outline"
			data-testid="agent-email-open-inbox"
			@click="openInbox"
		>
			{{ i18n.baseText('agents.channels.email.openInbox') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.status {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
