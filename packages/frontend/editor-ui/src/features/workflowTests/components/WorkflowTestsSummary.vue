<script setup lang="ts">
import { N8nBadge, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';

import type { WorkflowTestRunState } from '../workflowTests.store';
import { formatTestDuration, type WorkflowTestCounts } from '../workflowTests.display';

const props = defineProps<{
	run: WorkflowTestRunState | undefined;
	testCounts: WorkflowTestCounts;
}>();

const i18n = useI18n();

const counts = computed(() => ({
	...props.testCounts,
	pending: props.testCounts.running + props.testCounts.notRun,
}));

type SummaryState = 'passed' | 'failed' | 'error' | 'running' | 'notRun';

const state = computed<SummaryState>(() => props.run?.status ?? 'notRun');

const STATE_ICONS: Record<SummaryState, IconName> = {
	passed: 'circle-check',
	failed: 'circle-x',
	error: 'triangle-alert',
	running: 'loader-circle',
	notRun: 'flask-conical',
};

const title = computed(() => {
	switch (state.value) {
		case 'passed':
			return i18n.baseText('workflowTests.summary.title.passed');
		case 'failed':
			return i18n.baseText('workflowTests.summary.title.failed', {
				interpolate: {
					failed: String(counts.value.failed),
					total: String(counts.value.total),
				},
			});
		case 'error':
			return i18n.baseText('workflowTests.summary.title.error');
		case 'running':
			return i18n.baseText('workflowTests.summary.title.running');
		default:
			return i18n.baseText('workflowTests.summary.title.notRun');
	}
});

const totalDuration = computed(() => {
	const total = (props.run?.tests ?? []).reduce((sum, test) => sum + test.durationMs, 0);
	return total > 0 ? formatTestDuration(total) : undefined;
});

/** Each segment of the bar, as a share of all tests. */
const segments = computed(() => {
	const { total } = counts.value;
	if (total === 0) return [];
	return (['passed', 'failed', 'skipped', 'pending'] as const)
		.map((status) => ({ status, share: counts.value[status] / total }))
		.filter(({ share }) => share > 0);
});
</script>

<template>
	<section :class="[$style.summary, $style[state]]" data-testid="workflow-tests-summary">
		<div :class="$style.head">
			<span :class="$style.stateIcon">
				<N8nIcon :icon="STATE_ICONS[state]" :spin="state === 'running'" size="large" />
			</span>
			<div :class="$style.text">
				<N8nHeading tag="h2" size="medium" bold>{{ title }}</N8nHeading>
				<N8nText v-if="state === 'notRun'" size="small" color="text-light">
					{{ i18n.baseText('workflowTests.summary.notRunDescription') }}
				</N8nText>
				<N8nText v-else size="small" color="text-light" :class="$style.meta">
					<span v-if="run?.finishedAt">
						<TimeAgo :date="run.finishedAt" capitalize live />
					</span>
					<span v-if="totalDuration">
						{{
							i18n.baseText('workflowTests.summary.duration', {
								interpolate: { duration: totalDuration },
							})
						}}
					</span>
					<span>{{ i18n.baseText('workflowTests.summary.version') }}</span>
				</N8nText>
			</div>
			<div :class="$style.badges">
				<N8nBadge v-if="counts.passed" variant="success" size="small" leading-icon="circle-check">
					{{
						i18n.baseText('workflowTests.summary.passed', {
							interpolate: { count: String(counts.passed) },
						})
					}}
				</N8nBadge>
				<N8nBadge v-if="counts.failed" variant="danger" size="small" leading-icon="circle-x">
					{{
						i18n.baseText('workflowTests.summary.failed', {
							interpolate: { count: String(counts.failed) },
						})
					}}
				</N8nBadge>
				<N8nBadge v-if="counts.skipped" variant="filled" size="small" leading-icon="circle-minus">
					{{
						i18n.baseText('workflowTests.summary.skipped', {
							interpolate: { count: String(counts.skipped) },
						})
					}}
				</N8nBadge>
			</div>
		</div>
		<div v-if="segments.length" :class="$style.bar" aria-hidden="true">
			<span
				v-for="segment in segments"
				:key="segment.status"
				:class="[$style.segment, $style[`segment-${segment.status}`]]"
				:style="{ flexGrow: segment.share }"
			/>
		</div>
	</section>
</template>

<style module lang="scss">
.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.stateIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
	border-radius: 50%;
	color: var(--color--text--tint-1);
	background-color: var(--color--foreground--tint-2);
}

.passed .stateIcon {
	color: var(--color--success);
	background-color: color-mix(in srgb, var(--color--success) 12%, transparent);
}

.failed .stateIcon,
.error .stateIcon {
	color: var(--color--danger);
	background-color: color-mix(in srgb, var(--color--danger) 12%, transparent);
}

.running .stateIcon {
	color: var(--color--primary);
	background-color: color-mix(in srgb, var(--color--primary) 12%, transparent);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.meta {
	display: flex;
	flex-wrap: wrap;

	> span + span::before {
		content: '·';
		padding: 0 var(--spacing--3xs);
	}
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.bar {
	display: flex;
	gap: var(--spacing--5xs);
	height: var(--spacing--3xs);
	overflow: hidden;
	border-radius: var(--radius--lg);
}

.segment {
	flex-basis: 0;
	border-radius: var(--radius--sm);
	transition: flex-grow var(--duration--base) var(--easing--ease-out);
}

.segment-passed {
	background-color: var(--color--success);
}

.segment-failed {
	background-color: var(--color--danger);
}

.segment-skipped {
	background-color: var(--color--foreground--shade-1);
}

.segment-pending {
	background-color: var(--color--foreground);
}

.running .segment-pending {
	background-color: color-mix(in srgb, var(--color--primary) 35%, transparent);
}
</style>
