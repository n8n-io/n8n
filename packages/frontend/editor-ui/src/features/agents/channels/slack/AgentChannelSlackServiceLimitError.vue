<script setup lang="ts">
import { N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { SLACK_APP_DASHBOARD_URL } from './constants';

const i18n = useI18n();
</script>

<template>
	<N8nText size="small" :class="$style.error" data-testid="slack-managed-service-limit-error">
		{{ i18n.baseText('agents.channels.slack.managed.serviceLimitsExceeded.message') }}
		<N8nLink
			:href="SLACK_APP_DASHBOARD_URL"
			target="_blank"
			rel="noopener noreferrer"
			size="small"
			data-testid="slack-managed-service-limit-link"
		>
			{{ i18n.baseText('agents.channels.slack.managed.serviceLimitsExceeded.openDashboard') }}
		</N8nLink>
	</N8nText>
</template>

<style module lang="scss">
.error {
	color: var(--text-color--danger);
}
</style>
