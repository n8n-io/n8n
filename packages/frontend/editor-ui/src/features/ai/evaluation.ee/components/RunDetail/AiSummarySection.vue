<script setup lang="ts">
// TODO(TRUST-70 follow-up): replace this stub with real AI-generated summary.
// Plug-in points for the data layer:
//   1. Backend service that calls an LLM with run metrics + deltas to produce
//      `summary` and `recommendation` text.
//   2. New endpoint or extension to the existing run detail response carrying
//      the cached summary.
//   3. A regenerate-on-demand action wired to the refresh affordance below.
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nText } from '@n8n/design-system';

const locale = useI18n();
</script>

<template>
	<section :class="$style.container" data-test-id="ai-summary-section">
		<N8nHeading size="medium" :class="$style.title">
			{{ locale.baseText('evaluation.runDetail.aiSummary.title') }}
		</N8nHeading>
		<N8nText size="medium" :class="$style.placeholder">
			{{ locale.baseText('evaluation.runDetail.aiSummary.placeholder') }}
		</N8nText>
	</section>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: var(--spacing--lg) 0;
}

.title {
	color: var(--color--text);
}

.placeholder {
	color: var(--color--text--tint-1);
	font-style: italic;
}
</style>
