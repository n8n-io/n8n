<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nButton } from '@n8n/design-system';
import { useBrowserNotifications } from '@/app/composables/useBrowserNotifications';
import { useBuilderStore } from '../../builder.store';

const { requestPermission, recordDismissal, resetMetadata } = useBrowserNotifications();
const i18n = useI18n();
const builderStore = useBuilderStore();

async function onNotifyClick() {
	const { permission } = await requestPermission();

	if (permission === 'denied' || permission === 'granted') {
		resetMetadata();
	}

	builderStore.trackWorkflowBuilderJourney('browser_notification_accept');
}

function onDismissClick() {
	builderStore.trackWorkflowBuilderJourney('browser_notification_dismiss');
	recordDismissal();
}
</script>

<template>
	<div :class="$style.banner" data-test-id="notification-permission-banner">
		<N8nIcon icon="bell" size="medium" :class="$style.icon" />
		<span :class="$style.text">
			{{ i18n.baseText('aiAssistant.builder.notificationBanner.text') }}
		</span>
		<N8nButton
			variant="solid"
			size="xsmall"
			data-test-id="notification-banner-notify"
			@click="onNotifyClick"
		>
			{{ i18n.baseText('aiAssistant.builder.notificationBanner.notify') }}
		</N8nButton>
		<N8nIcon
			icon="x"
			size="small"
			:class="$style.closeIcon"
			data-test-id="notification-banner-dismiss"
			@click="onDismissClick"
		/>
	</div>
</template>

<style lang="scss" module>
.banner {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--xs);
	background: var(--callout--color--background--info);
	border: 1px solid var(--callout--border-color--info);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	border-bottom: none;
	margin: 0 var(--spacing--2xs);
	line-height: var(--line-height--xl);
}

.icon {
	flex-shrink: 0;
}

.text {
	color: var(--callout--color--text--info);
	font-size: var(--font-size--2xs);
	flex: 1;
}

.closeIcon {
	color: var(--callout--color--text--info);
	cursor: pointer;
	flex-shrink: 0;

	&:hover {
		opacity: 0.7;
	}
}
</style>
