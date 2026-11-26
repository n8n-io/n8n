<script setup lang="ts">
import { N8nButton, N8nCard, N8nDropdownMenu, N8nIconButton, N8nText } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

interface AgentSessionFlagCardProps {
	/** Number of flagged sessions. The card shows only when the count is above 0. */
	count: number;
	/** True when the Assistant is available. Shows the Fix errors button. */
	hasAssistantEnabled: boolean;
	/** True after the flagged sessions were sent to the Assistant. Hides the Fix errors button. */
	hasSentToAssistant?: boolean;
	/** Items for the actions menu. */
	actions: Array<DropdownMenuItemProps<string>>;
}

const {
	count,
	hasAssistantEnabled,
	hasSentToAssistant = false,
	actions,
} = defineProps<AgentSessionFlagCardProps>();

const emit = defineEmits<{
	/** Sends the flagged sessions to the Assistant. */
	'fix-error': [];
	/** Fires with the id of the selected menu item. */
	action: [actionId: string];
	/** Fires after the enter transition completes. */
	enter: [];
	/** Fires after the leave transition completes. */
	exit: [];
}>();

const i18n = useI18n();
</script>

<template>
	<Transition
		appear
		:enter-from-class="$style.hidden"
		:leave-to-class="$style.hidden"
		:enter-active-class="$style.entering"
		:leave-active-class="$style.leaving"
		@after-enter="emit('enter')"
		@after-leave="emit('exit')"
	>
		<N8nCard v-if="count > 0" :class="$style.card" data-test-id="agent-session-flag-card">
			<N8nText step="sm" bold>
				{{
					i18n.baseText('agentSessions.flagCard.title', {
						adjustToNumber: count,
						interpolate: { count: String(count) },
					})
				}}
			</N8nText>
			<template #append>
				<div :class="$style.actions">
					<N8nButton
						v-if="hasAssistantEnabled && !hasSentToAssistant"
						variant="outline"
						size="small"
						icon="sparkles"
						:label="i18n.baseText('agentSessions.flagCard.fix')"
						data-test-id="agent-session-flag-card-fix"
						@click="emit('fix-error')"
					/>
					<N8nDropdownMenu placement="bottom-end" :items="actions" @select="emit('action', $event)">
						<template #trigger>
							<N8nIconButton
								icon="ellipsis"
								variant="ghost"
								size="small"
								:aria-label="i18n.baseText('agentSessions.actions')"
								data-test-id="agent-session-flag-card-actions"
							/>
						</template>
					</N8nDropdownMenu>
				</div>
			</template>
		</N8nCard>
	</Transition>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.card {
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.entering,
.leaving {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.hidden {
	opacity: 0;
	transform: translateY(calc(-1 * var(--spacing--4xs)));
}
</style>
