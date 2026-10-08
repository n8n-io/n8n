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
		<div :class="$style.head" data-test-id="instance-ai-test-agent-head">
			<span :class="$style.iconWrap" aria-hidden="true" data-test-id="instance-ai-test-agent-icon">
				<N8nIcon icon="sparkles" size="medium" />
			</span>
			<N8nText bold color="text-dark" :class="$style.title">
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
				:class="$style.generate"
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
@use '../../shared/styles/inline-offer' as inlineOffer;

/* Flat card — no header/footer rules. The design separates the three rows with
   a single gap, so adding dividers would over-structure it. */
.root {
	@include inlineOffer.card;
}

.head {
	@include inlineOffer.head;
}

.iconWrap {
	@include inlineOffer.icon-tile;
}

.title {
	@include inlineOffer.title;
}

// Two classes, so the ring wins over the button's own focus style.
.root .generate {
	@include inlineOffer.primary-action;
}

.options {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
