<script setup lang="ts">
/**
 * Row component for workflow tools in the Agent Tools modal.
 *
 * Mirrors the layout of AgentToolItem but rendered for workflow refs — a
 * "workflow" lucide icon instead of a NodeIcon, no credential-aware subtitle,
 * no missing-creds affordance. `mode` controls the action area: Connect
 * button for the Available section, gear + Connected badge for the
 * Connected section.
 */
import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ToolConnectedBadge from './ToolConnectedBadge.vue';

withDefaults(
	defineProps<{
		mode: 'configured' | 'available';
		name: string;
		description?: string | null;
		rowTestId?: string;
		configureTestId?: string;
	}>(),
	{ description: undefined, rowTestId: undefined, configureTestId: undefined },
);

defineEmits<{
	configure: [];
	add: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.row" :data-test-id="rowTestId">
		<div :class="$style.label">
			<div :class="$style.iconWrapper">
				<N8nIcon icon="workflow" :size="20" :class="$style.workflowIcon" />
			</div>
			<div :class="$style.textWrapper">
				<N8nText size="small" color="text-dark" :class="$style.name">
					{{ name }}
				</N8nText>
				<N8nText v-if="description" size="small" color="text-light" :class="$style.description">
					{{ description }}
				</N8nText>
			</div>
		</div>

		<div :class="$style.actions">
			<template v-if="mode === 'configured'">
				<ToolConnectedBadge />
				<N8nTooltip :content="i18n.baseText('agents.tools.configure')">
					<N8nIconButton
						icon="settings"
						variant="ghost"
						text
						:aria-label="i18n.baseText('agents.tools.configure')"
						:data-test-id="configureTestId"
						@click="$emit('configure')"
					/>
				</N8nTooltip>
			</template>
			<template v-else>
				<N8nButton variant="subtle" size="small" @click="$emit('add')">
					{{ i18n.baseText('agents.tools.connect') }}
				</N8nButton>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	min-width: 0;
	flex: 1;
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.workflowIcon {
	color: var(--color--primary);
}

.textWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
