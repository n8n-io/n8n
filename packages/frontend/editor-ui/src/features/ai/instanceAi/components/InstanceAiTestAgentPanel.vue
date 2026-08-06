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
		<!-- `step` rather than `size`: the design's 13px body is `--font-size--xs`,
			 which the `size` scale skips between small (12px) and medium (14px). -->
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
	/* `--radius--lg` resolves to 8px, not the 20px its name suggests — the legacy
	   layer overrides the primitive. It is the closest token to the design's 10px
	   and the one the sibling offer card uses, so the two match in the thread. */
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
