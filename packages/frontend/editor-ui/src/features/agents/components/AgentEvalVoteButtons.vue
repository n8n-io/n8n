<script setup lang="ts">
/**
 * The 👍/👎 pair on a reviewed case. Purely a control: it reports the vote and
 * reflects the current one, and knows nothing about reasons or persistence.
 */
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentEvalVote } from '../agentEvals.types';

const props = defineProps<{
	vote: AgentEvalVote | null;
	disabled?: boolean;
	/** Shown instead of the vote label when the buttons are disabled. */
	disabledReason?: string;
}>();

const emit = defineEmits<{
	vote: [AgentEvalVote];
}>();

const i18n = useI18n();

const labelFor = (vote: AgentEvalVote) =>
	props.disabled && props.disabledReason
		? props.disabledReason
		: i18n.baseText(
				vote === 'up'
					? 'agents.builder.agentEvals.review.row.thumbsUp'
					: 'agents.builder.agentEvals.review.row.thumbsDown',
			);
</script>

<template>
	<div :class="$style.votes">
		<N8nTooltip :content="labelFor('up')" placement="top">
			<N8nIconButton
				icon="thumbs-up"
				size="small"
				variant="outline"
				:class="{ [$style.selectedUp]: vote === 'up' }"
				:disabled="disabled"
				:aria-label="labelFor('up')"
				:aria-pressed="vote === 'up'"
				data-testid="agent-eval-vote-up"
				@click="emit('vote', 'up')"
			/>
		</N8nTooltip>
		<N8nTooltip :content="labelFor('down')" placement="top">
			<N8nIconButton
				icon="thumbs-down"
				size="small"
				variant="outline"
				:class="{ [$style.selectedDown]: vote === 'down' }"
				:disabled="disabled"
				:aria-label="labelFor('down')"
				:aria-pressed="vote === 'down'"
				data-testid="agent-eval-vote-down"
				@click="emit('vote', 'down')"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.votes {
	display: flex;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
}

/* The chosen side is tinted by what it means, not filled with the brand colour:
   the design reads agreement and disagreement off the hue. */
.selectedUp {
	--button--color--background: var(--background--success);
}

.selectedDown {
	--button--color--background: var(--background--danger);
}
</style>
