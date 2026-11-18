<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nIcon,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import SourceBadge from '@/features/projectSettingsPrototype/components/SourceBadge.vue';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import { projectState, store } from '@/features/projectSettingsPrototype/state/store';

/**
 * Instance admins set a project's limits. Nobody changes them here, whatever
 * their role, so the page only reports the limits and the usage against them.
 */
const props = defineProps<{ projectId: string }>();

type Level = 'ok' | 'warning' | 'reached';

interface Meter {
	used: number;
	/** The limit that applies: the project's own, or the instance's. `null` is no limit. */
	limit: number | null;
	/** The project has no limit of its own. */
	shared: boolean;
	/** From 0 to 1, or `null` without a limit. */
	ratio: number | null;
	level: Level;
}

interface LimitBlock {
	id: 'monthly' | 'concurrency';
	title: string;
	description: string;
	/** Beside the badge: where the limit comes from when it isn't the project's own. */
	sourceNote: string | undefined;
	usageLabel: string;
	percentLabel: string | undefined;
	/** For assistive tech: 0 to 100. */
	percent: number | undefined;
	level: Level;
	note: string | undefined;
}

const SHARED_NOTE = 'Every project without its own limit counts toward the instance limit.';
const NO_LIMIT_NOTE = 'The instance has no limit.';

const can = useCan();

const state = computed(() => projectState(props.projectId));
const instanceLimits = computed(() => store.instance.limits);

function measure(
	used: number,
	ownLimit: number | null,
	instanceLimit: number | null,
	alertAtPercent: number | null,
): Meter {
	const limit = ownLimit ?? instanceLimit;
	const shared = ownLimit === null;
	if (limit === null) return { used, limit, shared, ratio: null, level: 'ok' };

	const ratio = limit > 0 ? used / limit : 1;
	let level: Level = 'ok';
	if (ratio >= 1) level = 'reached';
	else if (alertAtPercent !== null && ratio * 100 >= alertAtPercent) level = 'warning';
	return { used, limit, shared, ratio: Math.min(ratio, 1), level };
}

const monthly = computed(() =>
	measure(
		state.value.usage.executionsThisMonth,
		state.value.limits.monthlyExecutions,
		instanceLimits.value.monthlyExecutions,
		instanceLimits.value.alertAtPercent,
	),
);

/** The alert is for monthly limits only, so concurrency never warns ahead of its limit. */
const concurrency = computed(() =>
	measure(
		state.value.usage.runningNow,
		state.value.limits.concurrency,
		instanceLimits.value.concurrency,
		null,
	),
);

/** Rounded down, so the page never reads 100% before the limit is reached. */
function percentOf(meter: Meter): number | undefined {
	return meter.ratio === null ? undefined : Math.floor(meter.ratio * 100);
}

function percentLabelOf(meter: Meter): string | undefined {
	const percent = percentOf(meter);
	if (percent === undefined) return undefined;
	return percent === 0 && meter.used > 0 ? 'Less than 1%' : `${percent}%`;
}

function sourceNoteOf(meter: Meter): string | undefined {
	if (!meter.shared) return undefined;
	return meter.limit === null ? 'No limit' : 'Shares the instance limit';
}

function usageLabelOf(meter: Meter, unit: string): string {
	return meter.limit === null
		? `${formatNumber(meter.used)} ${unit}`
		: `${formatNumber(meter.used)} of ${formatNumber(meter.limit)} ${unit}`;
}

function describe(meter: Meter, own: string, whenShared: string): string {
	if (!meter.shared) return own;
	return `${whenShared} ${meter.limit === null ? NO_LIMIT_NOTE : SHARED_NOTE}`;
}

const monthlyNote = computed(() => {
	const { alertAtPercent } = instanceLimits.value;
	if (monthly.value.limit === null) return undefined;
	if (monthly.value.level === 'reached') return 'Monthly limit reached';
	return alertAtPercent === null ? undefined : `Instance admins are alerted at ${alertAtPercent}%`;
});

const blocks = computed<LimitBlock[]>(() => [
	{
		id: 'monthly',
		title: 'Monthly executions',
		description: describe(
			monthly.value,
			'Production executions this project can run each calendar month.',
			'Production executions each calendar month.',
		),
		sourceNote: sourceNoteOf(monthly.value),
		usageLabel: usageLabelOf(monthly.value, 'this month'),
		percentLabel: percentLabelOf(monthly.value),
		percent: percentOf(monthly.value),
		level: monthly.value.level,
		note: monthlyNote.value,
	},
	{
		id: 'concurrency',
		title: 'Concurrency',
		description: describe(
			concurrency.value,
			'Production executions this project can run at the same time.',
			'Production executions running at the same time.',
		),
		sourceNote: sourceNoteOf(concurrency.value),
		usageLabel: usageLabelOf(concurrency.value, 'running now'),
		percentLabel: percentLabelOf(concurrency.value),
		percent: percentOf(concurrency.value),
		level: concurrency.value.level,
		note:
			concurrency.value.level === 'reached'
				? 'Limit reached. New executions wait until one finishes.'
				: undefined,
	},
]);

/** Bound in the styles, so the bars need no inline width. */
const monthlyWidth = computed(() => `${(monthly.value.ratio ?? 0) * 100}%`);
const concurrencyWidth = computed(() => `${(concurrency.value.ratio ?? 0) * 100}%`);
</script>

<template>
	<div :class="$style.page" data-test-id="proto-limits-page">
		<N8nSettingsSection>
			<N8nSettingsRowGroup v-for="block in blocks" :key="block.id">
				<N8nSettingsRow layout="custom" :data-test-id="`proto-limits-${block.id}`">
					<div :class="$style.block" :data-level="block.level">
						<div :class="$style.header">
							<div :class="$style.heading">
								<N8nText bold color="text-dark">{{ block.title }}</N8nText>
								<N8nText size="small" color="text-light">{{ block.description }}</N8nText>
							</div>
							<div :class="$style.source">
								<N8nText
									v-if="block.sourceNote"
									size="small"
									color="text-light"
									:data-test-id="`proto-limits-${block.id}-source-note`"
								>
									{{ block.sourceNote }}
								</N8nText>
								<SourceBadge source="locked" />
							</div>
						</div>

						<div :class="$style.usage">
							<div :class="$style.figures">
								<N8nText color="text-dark" :data-test-id="`proto-limits-${block.id}-usage`">
									{{ block.usageLabel }}
								</N8nText>
								<N8nText
									v-if="block.percentLabel"
									:class="$style.percent"
									size="small"
									color="text-base"
									:data-test-id="`proto-limits-${block.id}-percent`"
								>
									{{ block.percentLabel }}
								</N8nText>
							</div>
							<div
								v-if="block.percent !== undefined"
								:class="$style.track"
								role="progressbar"
								aria-valuemin="0"
								aria-valuemax="100"
								:aria-valuenow="block.percent"
								:aria-label="`${block.title}: ${block.usageLabel}`"
							>
								<div :class="[$style.fill, $style[block.id], $style[block.level]]" />
							</div>
							<div
								v-if="block.note"
								:class="[$style.note, $style[block.level]]"
								:data-test-id="`proto-limits-${block.id}-note`"
							>
								<N8nIcon v-if="block.level !== 'ok'" icon="triangle-alert" size="small" />
								<span>{{ block.note }}</span>
							</div>
						</div>
					</div>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<div :class="$style.footer">
				<N8nText size="small" color="text-light">Instance admins set these limits.</N8nText>
				<RouterLink
					v-if="can('instance:settings:edit')"
					v-slot="{ href, navigate }"
					to="/settings/projects"
					custom
				>
					<N8nButton
						variant="outline"
						size="small"
						:href="href"
						data-test-id="proto-limits-change-link"
						@click="navigate"
					>
						Change in instance settings
					</N8nButton>
				</RouterLink>
			</div>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.source {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: var(--spacing--2xs);
	white-space: nowrap;
}

.usage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.figures {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
	font-variant-numeric: tabular-nums;
}

.percent {
	white-space: nowrap;
}

.track {
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
	overflow: clip;
}

.fill {
	height: 100%;
	border-radius: var(--radius--full);
	background-color: var(--color--success);
	transition: width var(--duration--snappy) var(--easing--ease-out);

	&.monthly {
		width: v-bind(monthlyWidth);
	}

	&.concurrency {
		width: v-bind(concurrencyWidth);
	}

	&.warning {
		background-color: var(--color--warning);
	}

	&.reached {
		background-color: var(--color--danger);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.note {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);

	&.warning {
		color: var(--text-color--warning);
	}

	&.reached {
		color: var(--text-color--danger);
	}
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--height--sm);
}
</style>
