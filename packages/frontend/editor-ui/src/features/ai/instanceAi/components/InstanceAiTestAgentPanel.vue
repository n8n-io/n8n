<script setup lang="ts">
/**
 * Post-setup suggestion to test the agent that was just built. Suggests rather
 * than imposes: the dismiss action is a peer of the CTA, not a close affordance
 * tucked in a corner.
 */
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineEmits<{
	generate: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-test-agent-panel">
		<div :class="$style.head">
			<span :class="$style.iconWrap">
				<N8nIcon icon="sparkles" size="medium" />
			</span>
			<N8nText bold color="text-dark">
				{{ i18n.baseText('instanceAi.testAgent.title') }}
			</N8nText>
		</div>
		<!-- `step` rather than `size`: the `size` scale skips `--font-size--xs`,
			 which is the step this body copy wants. -->
		<N8nText step="xs" color="text-base">
			{{ i18n.baseText('instanceAi.testAgent.description') }}
		</N8nText>
		<div :class="$style.options">
			<N8nButton
				variant="solid"
				size="small"
				data-test-id="instance-ai-test-agent-generate"
				@click="$emit('generate')"
			>
				{{ i18n.baseText('instanceAi.testAgent.generate') }}
			</N8nButton>
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="instance-ai-test-agent-dismiss"
				@click="$emit('dismiss')"
			>
				{{ i18n.baseText('instanceAi.testAgent.dismiss') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
/* Flat card — no header/footer rules. The design separates the three rows with
   a single gap, so adding dividers would over-structure it. */
.root {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	margin: var(--spacing--2xs) 0;
	background-color: var(--background--surface);
	border: var(--border);
	/* Same radius token as the sibling offer card, so the two match in the thread.
	   Note `--radius--sm` is not a smaller version of this one: the legacy layer
	   overrides both, and it lands far tighter than the primitives file suggests. */
	border-radius: var(--radius--lg);
}

.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.iconWrap {
	display: flex;
	padding: var(--spacing--3xs);
	background-color: var(--background--subtle);
	border-radius: var(--radius--2xs);
}

.options {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
