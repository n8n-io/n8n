<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';

import type { WorkflowTestRunState } from '../workflowTests.store';
import { formatTestDuration, type WorkflowTestCounts } from '../workflowTests.display';

/** The status line of the Tests tab: one icon, one sentence, the counts, and the bar. */
const props = defineProps<{
	run: WorkflowTestRunState | undefined;
	testCounts: WorkflowTestCounts;
}>();

const i18n = useI18n();

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
					failed: String(props.testCounts.failed),
					total: String(props.testCounts.total),
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

const pending = computed(() => props.testCounts.running + props.testCounts.notRun);

const progress = computed(() =>
	i18n.baseText('workflowTests.summary.progress', {
		interpolate: {
			done: String(props.testCounts.total - pending.value),
			total: String(props.testCounts.total),
		},
	}),
);

const total = computed(() =>
	i18n.baseText('workflowTests.summary.total', {
		adjustToNumber: props.testCounts.total,
		interpolate: { count: String(props.testCounts.total) },
	}),
);

const COUNT_LABELS = {
	passed: 'workflowTests.summary.passed',
	failed: 'workflowTests.summary.failed',
	skipped: 'workflowTests.summary.skipped',
	notRun: 'workflowTests.summary.notRun',
} as const;

const countItems = computed(() =>
	(['passed', 'failed', 'skipped', 'notRun'] as const)
		.filter((status) => props.testCounts[status] > 0)
		.map((status) => ({
			status,
			text: i18n.baseText(COUNT_LABELS[status], {
				interpolate: { count: String(props.testCounts[status]) },
			}),
		})),
);

const totalDuration = computed(() => {
	const duration = (props.run?.tests ?? []).reduce((sum, test) => sum + test.durationMs, 0);
	return duration > 0 ? formatTestDuration(duration) : undefined;
});

/** Each segment of the bar, as a share of all tests. */
const segments = computed(() => {
	const counts = { ...props.testCounts, pending: pending.value };
	if (counts.total === 0) return [];
	return (['passed', 'failed', 'skipped', 'pending'] as const)
		.map((status) => ({ status, share: counts[status] / counts.total }))
		.filter(({ share }) => share > 0);
});
</script>

<template>
	<section :class="[$style.summary, $style[state]]" data-testid="workflow-tests-summary">
		<div :class="$style.head">
			<span :class="$style.stateIcon">
				<N8nIcon :icon="STATE_ICONS[state]" :spin="state === 'running'" size="large" />
			</span>
			<div :class="$style.text" role="status">
				<N8nHeading tag="h2" size="medium" bold>{{ title }}</N8nHeading>
				<N8nText size="small" color="text-light" :class="$style.meta">
					<span v-if="state === 'notRun'">{{ total }}</span>
					<template v-else-if="state === 'running'">
						<span v-if="testCounts.total > 0">{{ progress }}</span>
					</template>
					<template v-else>
						<span
							v-for="item in countItems"
							:key="item.status"
							:class="$style[`count-${item.status}`]"
						>
							{{ item.text }}
						</span>
						<span v-if="totalDuration">
							{{
								i18n.baseText('workflowTests.summary.duration', {
									interpolate: { duration: totalDuration },
								})
							}}
						</span>
						<span v-if="run?.finishedAt">
							<TimeAgo :date="run.finishedAt" capitalize live />
						</span>
						<span>{{ i18n.baseText('workflowTests.summary.version') }}</span>
					</template>
				</N8nText>
			</div>
			<div :class="$style.actions">
				<slot name="actions" />
			</div>
		</div>
		<div :class="$style.bar" aria-hidden="true">
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
@use '@n8n/design-system/css/mixins/motion';

.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.stateIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--full);
	color: var(--color--text--tint-1);
	background-color: var(--background--subtle);
	transition:
		color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
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
	gap: var(--spacing--5xs);
	// The basis lets the actions wrap below the text in a narrow column.
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	font-variant-numeric: tabular-nums;

	> span + span::before {
		content: '·';
		padding: 0 var(--spacing--3xs);
		color: var(--color--text--tint-1);
	}
}

.count-passed {
	color: var(--text-color--success);
}

.count-failed {
	color: var(--text-color--danger);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.bar {
	display: flex;
	gap: var(--spacing--5xs);
	height: var(--spacing--4xs);
	overflow: hidden;
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
}

.segment {
	flex-basis: 0;
	border-radius: var(--radius--full);
	transition: flex-grow var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
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
