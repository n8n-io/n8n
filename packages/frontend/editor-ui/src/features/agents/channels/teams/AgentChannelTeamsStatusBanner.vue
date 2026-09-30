<script setup lang="ts">
/** Whether the Teams channel is running, and when it last heard from someone. */
import { computed } from 'vue';
import { N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { AgentChannelClientStatus } from '../../composables/useAgentIntegrationStatus';

const props = withDefaults(
	defineProps<{
		runtimeStatus?: AgentChannelClientStatus;
		runtimeError?: string;
		lastInboundAt?: string;
		isPublished?: boolean;
	}>(),
	{ runtimeStatus: 'unknown', runtimeError: '', lastInboundAt: '', isPublished: true },
);

const emit = defineEmits<{ showEndpoint: [] }>();

const i18n = useI18n();

type BannerState = 'unpublished' | 'connected' | 'starting' | 'error' | 'unknown';

const STATES: Record<BannerState, { icon: IconName; title: BaseTextKey; hint: BaseTextKey }> = {
	unpublished: {
		icon: 'info',
		title: 'agents.channels.teams.settings.status.unpublished',
		hint: 'agents.channels.teams.settings.status.unpublishedHint',
	},
	connected: {
		icon: 'circle-check',
		title: 'agents.channels.teams.settings.status.connected',
		hint: 'agents.channels.teams.settings.status.connectedHint',
	},
	starting: {
		icon: 'loader',
		title: 'agents.channels.teams.settings.status.starting',
		hint: 'agents.channels.teams.settings.status.startingHint',
	},
	error: {
		icon: 'triangle-alert',
		title: 'agents.channels.teams.settings.status.error',
		hint: 'agents.channels.teams.settings.status.errorHint',
	},
	unknown: {
		icon: 'circle-alert',
		title: 'agents.channels.teams.settings.status.unknown',
		hint: 'agents.channels.teams.settings.status.unknownHint',
	},
};

const state = computed<BannerState>(() => {
	// An unpublished agent's channels never run, whatever a stale answer says.
	if (!props.isPublished || props.runtimeStatus === 'configured') return 'unpublished';
	if (props.runtimeStatus === 'connected') return 'connected';
	if (props.runtimeStatus === 'starting') return 'starting';
	if (props.runtimeStatus === 'error') return 'error';
	return 'unknown';
});

// Only a running channel is vouched for by its last message; on a broken one
// the date would read as a recent health check.
const verifiedDate = computed(() => {
	if (state.value !== 'connected' || !props.lastInboundAt) return '';
	const date = new Date(props.lastInboundAt);
	if (Number.isNaN(date.getTime())) return '';
	const sameYear = date.getFullYear() === new Date().getFullYear();
	return new Intl.DateTimeFormat(undefined, {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' }),
	}).format(date);
});

const title = computed(() => {
	const status = i18n.baseText(STATES[state.value].title);
	if (!verifiedDate.value) return status;
	return i18n.baseText('agents.channels.teams.settings.status.verified', {
		interpolate: { status, date: verifiedDate.value },
	});
});

const hint = computed(() =>
	state.value === 'error' && props.runtimeError
		? props.runtimeError
		: i18n.baseText(STATES[state.value].hint),
);

const menuItems = computed<Array<ActionDropdownItem<'existing-bot'>>>(() => [
	{ id: 'existing-bot', label: i18n.baseText('agents.channels.teams.setup.createBot.existingBot') },
]);

function onSelect(action: 'existing-bot') {
	if (action === 'existing-bot') emit('showEndpoint');
}
</script>

<template>
	<div
		:class="[$style.banner, $style[state]]"
		data-testid="teams-status-banner"
		:data-state="state"
	>
		<N8nIcon :icon="STATES[state].icon" size="large" :class="$style.icon" />
		<div :class="$style.text">
			<N8nText size="small" bold data-testid="teams-status-title">{{ title }}</N8nText>
			<N8nText size="small" :class="$style.hint" data-testid="teams-status-hint">
				{{ hint }}
			</N8nText>
		</div>
		<N8nActionDropdown
			:items="menuItems"
			activator-icon="ellipsis"
			:teleported="false"
			data-testid="teams-status-menu"
			@select="onSelect"
		/>
	</div>
</template>

<style module lang="scss">
.banner {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: light-dark(var(--color--neutral-50), var(--color--white-alpha-50));
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.hint {
	color: var(--text-color--subtler);
	overflow-wrap: anywhere;
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.connected .icon {
	color: var(--color--success);
}

.error .icon {
	color: var(--color--danger);
}
</style>
