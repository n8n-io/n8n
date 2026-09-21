<script setup lang="ts">
import {
	N8nButton,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
	updatedIconSet,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { computed } from 'vue';
import type { AgentChannelConnectAction } from '../channels/types';

interface Props {
	integration: ChatIntegrationDescriptor;
	configured: boolean;
	connected: boolean;
	connectAction: AgentChannelConnectAction;
	loading?: boolean;
	/**
	 * Set up and meant to be running, but the last startup attempt failed. Never
	 * true together with `connected`.
	 */
	notRunning?: boolean;
	/** Why it isn't running, shown on hover. */
	runtimeError?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	setup: [channelType: string];
	edit: [channelType: string];
}>();

const i18n = useI18n();

function isIconName(icon: string): icon is IconName {
	return icon in updatedIconSet;
}

const statusLabel = computed(() => {
	if (props.notRunning) return i18n.baseText('agents.channels.modal.notRunning');
	if (props.connected) return i18n.baseText('agents.channels.modal.connected');
	return i18n.baseText('agents.channels.modal.configured');
});

/**
 * The tooltip is the only place the startup error is shown, so it must not be
 * empty when there is one to explain — fall back to generic copy if the server
 * reported a failure without a message.
 */
const statusTooltip = computed(() => {
	if (!props.notRunning) return '';
	return props.runtimeError || i18n.baseText('agents.channels.modal.notRunning.tooltip');
});
</script>

<template>
	<li :class="$style.channelItem">
		<template v-if="loading">
			<div :class="$style.iconWrapper">
				<N8nLoading variant="circle" />
			</div>
			<div :class="$style.content">
				<N8nLoading variant="text" :class="$style.nameSkeleton" />
			</div>
			<div :class="$style.channelActions">
				<N8nLoading variant="rect" :class="$style.buttonSkeleton" />
			</div>
		</template>

		<template v-else>
			<div :class="$style.iconWrapper">
				<N8nIcon
					:icon="integration.icon && isIconName(integration.icon) ? integration.icon : 'zap'"
					:size="28"
					:class="$style.channelIcon"
				/>
			</div>
			<div :class="$style.content">
				<N8nText :class="$style.name" size="medium" bold color="text-dark">
					{{ integration.label }}
				</N8nText>
			</div>

			<div :class="$style.channelActions">
				<N8nTooltip
					v-if="configured"
					:content="statusTooltip"
					:disabled="!notRunning"
					placement="top"
				>
					<button
						type="button"
						:class="$style.connectedTrigger"
						@click="emit('edit', integration.type)"
					>
						<span
							v-if="!notRunning"
							:class="$style.connectedIcon"
							data-testid="agent-channel-connected-indicator"
						>
							<N8nIcon icon="check" :size="14" aria-hidden="true" />
						</span>
						<span
							v-else-if="notRunning"
							:class="$style.notRunningIndicator"
							data-testid="agent-channel-not-running-indicator"
						/>
						{{ statusLabel }}
					</button>
				</N8nTooltip>
				<N8nButton
					v-else
					variant="subtle"
					size="medium"
					:icon="connectAction.icon"
					@click="emit('setup', integration.type)"
				>
					{{ connectAction.label }}
				</N8nButton>
			</div>
		</template>
	</li>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.channelItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	display: flex;
	align-items: center;
	justify-content: center;
}

.channelIcon {
	color: var(--icon-color--strong);
}

.nameSkeleton {
	width: 30%;
}

.buttonSkeleton {
	height: var(--spacing--xl);
	width: calc(var(--spacing--xl) * 2.5);
	display: flex;
	align-items: center;
	justify-content: center;

	div {
		height: 100%;
	}
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.channelActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.connectedTrigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: 0;
	border-radius: var(--radius--2xs);
	background: none;
	color: var(--color--text--tint-1);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-1);
	}

	@include focus.focus-visible-ring;
}

.connectedIcon {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--color--success);
}

.notRunningIndicator {
	flex-shrink: 0;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background: var(--color--danger);
}
</style>
