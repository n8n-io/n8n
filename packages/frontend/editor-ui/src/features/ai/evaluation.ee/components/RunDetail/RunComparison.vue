<script setup lang="ts">
// TODO(TRUST-70 follow-up): build the run-comparison view.
// Plug-in points:
//   1. UI to pick two runs from the runs list (e.g. selectable rows or
//      `Compare` buttons on individual run cards).
//   2. A side-by-side view diffing aggregated metrics + per-case metrics
//      between two runs of the same workflow.
//   3. Reuse `computeDelta`, `getDeltaTone`, and `MetricSummaryStrip` to
//      render the comparison consistently with the run detail page.
//
// This component currently renders nothing; it exists as an anchor for the
// future comparison feature so the entry point and import path are stable.
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

const locale = useI18n();
</script>

<template>
	<section :class="$style.placeholder" data-test-id="run-comparison-placeholder">
		<N8nText size="medium" :class="$style.text">
			{{ locale.baseText('evaluation.runDetail.runComparison.comingSoon') }}
		</N8nText>
	</section>
</template>

<style module lang="scss">
.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius);
}

.text {
	color: var(--color--text--tint-1);
	font-style: italic;
}
</style>
