<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nIcon, N8nIconButton, N8nLink, N8nText } from '@n8n/design-system';
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
	store.requestSettingHighlight();
	await router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}
</script>

<template>
	<div v-if="visible" :class="$style.notification" data-test-id="open-in-assistant-notification">
		<N8nIcon icon="sparkles" color="primary" :class="$style.icon" />
		<div :class="$style.content">
			<N8nText size="small" color="text-dark" bold>
				{{ i18n.baseText('experiments.openWorkflowInAssistant.notification.title') }}
			</N8nText>
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('experiments.openWorkflowInAssistant.notification.text') }}
				<N8nLink
					size="small"
					:class="$style.settingsLink"
					data-test-id="open-in-assistant-notification-settings-link"
					@click="onSettingsLink"
				>
					{{ i18n.baseText('experiments.openWorkflowInAssistant.notification.settingsLink') }}
				</N8nLink>
			</N8nText>
		</div>
		<N8nIconButton
			icon="x"
			variant="ghost"
			size="small"
			:class="$style.close"
			:aria-label="i18n.baseText('generic.close')"
			data-test-id="open-in-assistant-notification-close"
			@click="store.closeNotification('close')"
		/>
		<div :class="$style.actions">
			<N8nButton
				variant="ghost"
				size="small"
				:label="i18n.baseText('experiments.openWorkflowInAssistant.notification.neverShowAgain')"
				data-test-id="open-in-assistant-notification-never"
				@click="store.neverShowAgain()"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('experiments.openWorkflowInAssistant.notification.gotIt')"
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
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: start;
	column-gap: var(--spacing--2xs);
	// Shrink with the content area so narrow viewports do not clip the box.
	width: min(380px, calc(100% - 2 * var(--spacing--lg)));
	padding: var(--spacing--sm);
	border-radius: var(--radius--lg);
	border: var(--border);
	background-color: var(--color--foreground--tint-2);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;

	@media (prefers-reduced-motion: no-preference) {
		animation: slide-in 200ms ease-out;
	}
}

@keyframes slide-in {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--2xs));
	}
}

.icon {
	// Optical alignment with the title's cap height.
	margin-top: var(--spacing--5xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.settingsLink {
	white-space: nowrap;
}

.close {
	// Pull the ghost button's hit area into the padding so its icon sits at the corner.
	margin: calc(-1 * var(--spacing--3xs)) calc(-1 * var(--spacing--3xs)) 0 0;
}

.actions {
	grid-column: 2 / -1;
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}
</style>
