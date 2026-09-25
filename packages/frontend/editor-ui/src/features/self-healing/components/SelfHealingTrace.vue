<script setup lang="ts">
import { N8nAiActivityStep, N8nAiActivityStepResultSection, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Read-only trace of one investigation: what failed, what the Assistant read,
 * what it concluded and what it changed. Tool calls reuse the Assistant chat's
 * activity steps and expand to their input and output.
 */
const props = defineProps<{
	reviewId: string;
}>();

const i18n = useI18n();
const store = useSelfHealingStore();

const entries = computed(() => store.getTrace(props.reviewId));
const usage = computed(() => store.getUsage(props.reviewId) ?? null);
const kind = computed(() => store.getInboxKind(props.reviewId));

function formatOffset(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

const summary = computed(() => {
	const cost = usage.value;
	return [
		{
			label: i18n.baseText('selfHealing.trace.outcome'),
			value: kind.value ? i18n.baseText(`selfHealing.inbox.kind.${kind.value}`) : '',
		},
		{
			label: i18n.baseText('selfHealing.trace.duration'),
			value: cost
				? i18n.baseText('selfHealing.trace.durationValue', {
						interpolate: {
							minutes: String(Math.floor(cost.durationSeconds / 60)),
							seconds: String(cost.durationSeconds % 60),
						},
					})
				: i18n.baseText('selfHealing.trace.instant'),
		},
		{ label: i18n.baseText('selfHealing.trace.turns'), value: String(cost?.turns ?? 0) },
		{
			label: i18n.baseText('selfHealing.trace.credits'),
			value: cost ? String(cost.credits) : i18n.baseText('selfHealing.usage.none'),
		},
	];
});

function formatInput(input: Record<string, unknown>): string {
	return JSON.stringify(input, null, 2);
}
</script>

<template>
	<div :class="$style.trace" data-test-id="self-healing-trace">
		<div :class="$style.summary" data-test-id="self-healing-trace-summary">
			<div v-for="item in summary" :key="item.label" :class="$style.stat">
				<N8nText size="small" color="text-light">{{ item.label }}</N8nText>
				<N8nText size="medium" color="text-dark">{{ item.value }}</N8nText>
			</div>
		</div>

		<ol :class="$style.steps">
			<li
				v-for="(entry, index) in entries"
				:key="index"
				:class="$style.step"
				:data-type="entry.type"
				data-test-id="self-healing-trace-entry"
			>
				<N8nText size="small" color="text-light" :class="$style.time">
					{{ formatOffset(entry.at) }}
				</N8nText>
				<div :class="$style.body">
					<N8nText v-if="entry.type === 'text'" size="medium" color="text-base">
						{{ entry.text }}
					</N8nText>
					<N8nAiActivityStep
						v-else-if="entry.type === 'tool'"
						:label="entry.label"
						:error="entry.error"
					>
						<N8nAiActivityStepResultSection>
							<N8nText size="xsmall" bold color="text-light" :class="$style.sectionLabel">
								{{ i18n.baseText('selfHealing.trace.input') }}
							</N8nText>
							<pre :class="$style.code">{{ formatInput(entry.input) }}</pre>
						</N8nAiActivityStepResultSection>
						<N8nAiActivityStepResultSection>
							<N8nText size="xsmall" bold color="text-light" :class="$style.sectionLabel">
								{{ i18n.baseText('selfHealing.trace.output') }}
							</N8nText>
							<pre :class="$style.code">{{ entry.output }}</pre>
						</N8nAiActivityStepResultSection>
					</N8nAiActivityStep>
					<N8nAiActivityStep
						v-else
						:label="entry.label"
						:error="entry.error"
						:has-content="false"
					/>
				</div>
			</li>
		</ol>
	</div>
</template>

<style lang="scss" module>
.trace {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: var(--review-activity--max-width);
}

.summary {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.stat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.steps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.step {
	display: grid;
	grid-template-columns: var(--spacing--xl) minmax(0, 1fr);
	align-items: baseline;
	gap: var(--spacing--xs);
}

.time {
	font-family: var(--font-family--monospace);
	font-variant-numeric: tabular-nums;
	text-align: right;
}

.body {
	min-width: 0;
}

// Wrap long lines: tool output is prose as often as it is data.
.code {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.sectionLabel {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--2xs) 0;
	text-transform: uppercase;
	letter-spacing: 0.02em;
}
</style>
