<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@n8n/composables/useStyles';

/** Offers live monitoring right after an agent is published for the first time. */
defineProps<{ agentName: string }>();
const emit = defineEmits<{ 'set-up': []; dismiss: [] }>();

const i18n = useI18n();
const { APP_Z_INDEXES } = useStyles();
</script>

<template>
	<div
		:class="$style.popover"
		:style="{ zIndex: APP_Z_INDEXES.MODALS }"
		role="dialog"
		:aria-label="i18n.baseText('agents.monitoring.popover.question')"
		data-testid="agent-monitoring-popover"
		@keydown.esc="emit('dismiss')"
	>
		<div :class="$style.header">
			<N8nIcon icon="circle-check" color="success" />
			<N8nText size="small" bold :class="$style.grow">{{
				i18n.baseText('agents.monitoring.popover.published', {
					interpolate: { name: agentName },
				})
			}}</N8nText>
			<N8nButton
				variant="ghost"
				size="small"
				icon="x"
				icon-only
				:aria-label="i18n.baseText('generic.close')"
				@click="emit('dismiss')"
			/>
		</div>
		<N8nText tag="p" size="large" color="text-dark" bold>{{
			i18n.baseText('agents.monitoring.popover.question')
		}}</N8nText>
		<N8nText tag="p" size="small" color="text-base">{{
			i18n.baseText('agents.monitoring.popover.description')
		}}</N8nText>
		<div :class="$style.actions">
			<N8nButton
				variant="solid"
				size="medium"
				data-testid="agent-monitoring-popover-set-up"
				@click="emit('set-up')"
				>{{ i18n.baseText('agents.monitoring.popover.setUp') }}</N8nButton
			>
			<N8nButton
				variant="outline"
				size="medium"
				data-testid="agent-monitoring-popover-not-now"
				@click="emit('dismiss')"
				>{{ i18n.baseText('agents.monitoring.popover.notNow') }}</N8nButton
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.popover {
	position: fixed;
	top: calc(var(--spacing--3xl) + var(--spacing--2xs));
	right: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: min(calc(100vw - var(--spacing--lg)), calc(var(--spacing--5xl) * 2.5));
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--dark);

	p {
		margin: 0;
	}
}
.header,
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.grow {
	flex: 1;
	min-width: 0;
}
</style>
