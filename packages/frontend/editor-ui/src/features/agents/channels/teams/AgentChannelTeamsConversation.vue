<script setup lang="ts">
/** Runtime conversation settings. Unlike the app fields, they need no new package. */
import { computed, ref } from 'vue';
import { N8nSettingsRow, N8nSettingsRowGroup } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentSessionIdleTimeoutField from '../../components/AgentSessionIdleTimeoutField.vue';

const idleTimeoutMinutes = defineModel<number | null>('idleTimeoutMinutes', { default: null });

const i18n = useI18n();

const open = ref(false);

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

function formatIdle(minutes: number): string {
	if (minutes % MINUTES_PER_DAY === 0) {
		const count = minutes / MINUTES_PER_DAY;
		return i18n.baseText('agents.channels.teams.settings.conversation.days', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (minutes % MINUTES_PER_HOUR === 0) {
		const count = minutes / MINUTES_PER_HOUR;
		return i18n.baseText('agents.channels.teams.settings.conversation.hours', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	return i18n.baseText('agents.channels.teams.settings.conversation.minutes', {
		adjustToNumber: minutes,
		interpolate: { count: String(minutes) },
	});
}

const summary = computed(() =>
	idleTimeoutMinutes.value
		? i18n.baseText('agents.channels.teams.settings.conversation.resetsAfter', {
				interpolate: { duration: formatIdle(idleTimeoutMinutes.value) },
			})
		: i18n.baseText('agents.channels.teams.settings.conversation.neverResets'),
);
</script>

<template>
	<N8nSettingsRowGroup :class="$style.group">
		<N8nSettingsRow
			v-model="open"
			:title="i18n.baseText('agents.channels.teams.settings.conversation.title')"
			:description="summary"
			expandable
			expand-label=""
			collapse-label=""
			:show-divider="false"
			data-testid="teams-conversation"
		>
			<template #expanded>
				<div :class="$style.body">
					<AgentSessionIdleTimeoutField v-model="idleTimeoutMinutes" />
				</div>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>
</template>

<style module lang="scss">
/* Same as the availability panel: let the modal show through in both themes. */
.group.group {
	background: transparent;
}

.body {
	padding: var(--spacing--2xs) var(--spacing--sm);
}
</style>
