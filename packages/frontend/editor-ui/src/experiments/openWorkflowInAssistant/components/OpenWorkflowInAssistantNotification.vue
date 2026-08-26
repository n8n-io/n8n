<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nIconButton, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { INSTANCE_AI_SETTINGS_VIEW } from '@/features/ai/instanceAi/constants';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';

const props = defineProps<{ threadId: string }>();

const store = useOpenWorkflowInAssistantStore();
const i18n = useI18n();
const router = useRouter();

const visible = computed(() => store.isNotificationVisibleFor(props.threadId));

async function onSettingsLink() {
	store.closeNotification('settings_link');
	await router.push({
		name: INSTANCE_AI_SETTINGS_VIEW,
		query: { highlight: 'default-editor' },
	});
}
</script>

<template>
	<div v-if="visible" :class="$style.notification" data-test-id="open-in-assistant-notification">
		<div :class="$style.body">
			<N8nText size="small">
				{{ i18n.baseText('openWorkflowInAssistant.notification.text') }}
				<N8nLink
					size="small"
					data-test-id="open-in-assistant-notification-settings-link"
					@click="onSettingsLink"
				>
					{{ i18n.baseText('openWorkflowInAssistant.notification.settingsLink') }}
				</N8nLink>
			</N8nText>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('generic.close')"
				data-test-id="open-in-assistant-notification-close"
				@click="store.closeNotification('close')"
			/>
		</div>
		<div :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('openWorkflowInAssistant.notification.neverShowAgain')"
				data-test-id="open-in-assistant-notification-never"
				@click="store.neverShowAgain()"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('openWorkflowInAssistant.notification.gotIt')"
				data-test-id="open-in-assistant-notification-got-it"
				@click="store.closeNotification('got_it')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.notification {
	position: absolute;
	right: var(--spacing--lg);
	// Clears the element-plus toast stack, which also renders bottom-right.
	bottom: calc(var(--spacing--3xl) * 2);
	// Above the input dock (z-3) and the expanded canvas (z-4).
	z-index: 5;
	max-width: 340px;
	padding: var(--spacing--sm);
	border-radius: var(--radius--lg);
	border: var(--border);
	background-color: var(--color--foreground--tint-2);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
}

.body {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}
</style>
