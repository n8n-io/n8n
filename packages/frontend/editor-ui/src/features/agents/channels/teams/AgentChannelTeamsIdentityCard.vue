<script setup lang="ts">
/** How the agent appears in Teams, with the package that carries it. */
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { AgentJsonConfig } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';

withDefaults(
	defineProps<{
		name: string;
		description: string;
		personalisation?: AgentJsonConfig['personalisation'] | null;
		tooltip?: string;
		ready: boolean;
		loading?: boolean;
	}>(),
	{ personalisation: null, tooltip: '', loading: false },
);

const emit = defineEmits<{ download: [] }>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="[$style.identity, ready ? $style.identityReady : $style.locked]"
		data-testid="teams-identity"
	>
		<AgentPersonalisationIcon :personalisation="personalisation" :size="36" />
		<div :class="$style.identityText">
			<N8nText size="small" bold data-testid="teams-identity-name">
				{{ name }}
				<N8nTooltip v-if="tooltip" :content="tooltip">
					<N8nIcon
						icon="info"
						size="xsmall"
						:class="$style.hint"
						data-testid="teams-identity-info"
					/>
				</N8nTooltip>
			</N8nText>
			<N8nText size="small" :class="$style.hint" data-testid="teams-identity-description">
				{{ description }}
			</N8nText>
		</div>
		<N8nButton
			variant="outline"
			size="medium"
			:disabled="!ready || loading"
			:loading="loading"
			data-testid="teams-download-package"
			@click="emit('download')"
		>
			{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
			<N8nIcon icon="download" size="medium" />
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs);
	/* Matches the availability panel next to it. */
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
}

/*
 * One step off the modal in both themes. The semantic tokens are relative to
 * the page, and the dark modal is lighter than the dark page surface.
 */
.identityReady {
	background: light-dark(var(--color--neutral-50), var(--color--white-alpha-50));
	/* The dark fill matches the subtle border, which would hide it. */
	border-color: light-dark(var(--border-color--subtle), var(--border-color));
}

.locked {
	opacity: 0.45;
	pointer-events: none;
}

.identityText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.hint {
	color: var(--text-color--subtler);
}
</style>
