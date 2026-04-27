<script setup lang="ts">
/**
 * Apps panel — POC. Mirrors AgentToolsListPanel's structure but for the new
 * "apps" (toolset) abstraction. One row per attached app.
 */
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { findAppDefinition } from '@n8n/agents/toolsets';
import shared from '../styles/agent-panel.module.scss';
import type { AgentJsonAppRef } from '../types';

const props = withDefaults(
	defineProps<{
		apps: AgentJsonAppRef[];
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'add-app': [];
	'open-app': [index: number];
	'remove-app': [index: number];
}>();

const totalCount = computed(() => props.apps.length);

function appIcon(kind: string): IconName {
	return (findAppDefinition(kind)?.icon ?? 'help-circle') as IconName;
}

function appLabel(kind: string): string {
	return findAppDefinition(kind)?.label ?? kind;
}
</script>

<template>
	<div
		:class="[$style.panel, shared.scrollbarThin, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
		data-testid="agent-apps-list-panel"
	>
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nText tag="h3" size="large" :bold="true">Apps</N8nText>
				<N8nText size="small" color="text-light"> {{ totalCount }} connected </N8nText>
			</div>
			<N8nButton
				type="primary"
				size="small"
				:disabled="props.disabled"
				data-testid="agent-apps-add"
				@click="emit('add-app')"
			>
				<template #prefix><N8nIcon icon="plus" :size="14" /></template>
				Add app
			</N8nButton>
		</div>

		<div v-if="totalCount === 0" :class="$style.empty">
			<N8nText size="small" color="text-light">
				No apps connected yet. Add an app to expose its full operation surface to the agent.
			</N8nText>
		</div>

		<div v-else :class="$style.rows">
			<div
				v-for="(app, index) in apps"
				:key="`${app.kind}-${index}`"
				:class="$style.row"
				role="button"
				tabindex="0"
				data-testid="agent-apps-list-row"
				@click="emit('open-app', index)"
				@keydown.enter.prevent="emit('open-app', index)"
				@keydown.space.prevent="emit('open-app', index)"
			>
				<N8nIcon :icon="appIcon(app.kind)" :size="18" :class="$style.appIcon" />
				<div :class="$style.appLabels">
					<N8nText :bold="true">{{ appLabel(app.kind) }}</N8nText>
					<N8nText size="small" color="text-light"> Credential: {{ app.credentialName }} </N8nText>
				</div>
				<N8nTooltip content="Remove app" placement="top">
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="mini"
						text
						aria-label="Remove app"
						data-testid="agent-apps-list-remove"
						@click.stop="emit('remove-app', index)"
					/>
				</N8nTooltip>
				<N8nIcon icon="chevron-right" :size="14" :class="$style.chevron" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.panel.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: transparent;
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.chevron {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.appIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.appLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}
</style>
