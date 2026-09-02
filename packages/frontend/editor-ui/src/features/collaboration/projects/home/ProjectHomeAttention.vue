<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nButton, N8nHeading, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { approveMockReview, promoteMockCandidate, useProjectHomeMocks } from './projectHome.mock';

export interface FailingWorkflow {
	workflowId: string;
	workflowName: string;
	count: number;
	lastFailedAt: Date;
	lastExecutionId: string;
}

const props = defineProps<{
	projectId: string;
	isTeamProject: boolean;
	failures: FailingWorkflow[];
	failuresLoading: boolean;
}>();

const emit = defineEmits<{ refreshFailures: [] }>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const executionsStore = useExecutionsStore();

const mocks = useProjectHomeMocks(props.projectId);

const reviews = computed(() => (props.isTeamProject ? mocks.reviews : []));
const promotions = computed(() => (props.isTeamProject ? mocks.promotions : []));
const limits = computed(() => (props.isTeamProject ? mocks.limits : []));

const attentionCount = computed(
	() =>
		reviews.value.filter((r) => r.waitingOn === 'you').length +
		promotions.value.length +
		props.failures.length +
		limits.value.length,
);

const isEmpty = computed(() => attentionCount.value === 0 && !props.failuresLoading);

function timeAgo(date: string | Date): string {
	const diffMs = Date.now() - new Date(date).getTime();
	const minutes = Math.round(diffMs / 60000);
	if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

function onApprove(reviewId: string) {
	approveMockReview(props.projectId, reviewId);
	toast.showMessage({ title: i18n.baseText('projectHome.approved.toast'), type: 'success' });
}

function onPromote(promotionId: string) {
	promoteMockCandidate(props.projectId, promotionId);
	toast.showMessage({ title: i18n.baseText('projectHome.promoted.toast'), type: 'success' });
}

async function onRetry(failure: FailingWorkflow) {
	try {
		await executionsStore.retryExecution(failure.lastExecutionId);
		toast.showMessage({ title: i18n.baseText('projectHome.retried.toast'), type: 'success' });
		emit('refreshFailures');
	} catch (error) {
		toast.showError(error, 'Retry failed');
	}
}

function openWorkflow(workflowId: string) {
	void router.push({ name: VIEWS.WORKFLOW, params: { name: workflowId } });
}

function openExecutions() {
	void router.push({ name: VIEWS.PROJECTS_EXECUTIONS, params: { projectId: props.projectId } });
}

function limitPercent(used: number, limit: number): number {
	return Math.min(Math.round((used / limit) * 100), 100);
}
</script>

<template>
	<section :class="$style.section" data-test-id="project-home-attention">
		<div :class="$style.sectionHeader">
			<N8nHeading tag="h2" size="medium" bold>
				{{ i18n.baseText('projectHome.attention.title') }}
			</N8nHeading>
			<N8nBadge v-if="attentionCount > 0" theme="primary">{{ attentionCount }}</N8nBadge>
		</div>

		<N8nText v-if="isEmpty" color="text-light" size="medium" :class="$style.empty">
			{{ i18n.baseText('projectHome.attention.empty') }}
		</N8nText>

		<div v-else :class="$style.buckets">
			<!-- Failing workflows (real data) -->
			<div v-if="failures.length > 0 || failuresLoading" :class="$style.bucket">
				<div :class="$style.bucketHeader">
					<N8nIcon icon="triangle-alert" color="danger" />
					<N8nText bold>{{ i18n.baseText('projectHome.attention.failures.title') }}</N8nText>
				</div>
				<div v-for="failure in failures" :key="failure.workflowId" :class="$style.row">
					<div :class="$style.rowMain">
						<N8nText bold :class="$style.rowTitle">{{ failure.workflowName }}</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('projectHome.attention.failures.count', {
									adjustToNumber: failure.count,
									interpolate: { count: failure.count },
								})
							}}
							· {{ timeAgo(failure.lastFailedAt) }}
						</N8nText>
					</div>
					<div :class="$style.rowActions">
						<N8nButton size="small" type="secondary" @click="onRetry(failure)">
							{{ i18n.baseText('projectHome.attention.failures.retry') }}
						</N8nButton>
						<N8nButton size="small" type="tertiary" @click="openWorkflow(failure.workflowId)">
							{{ i18n.baseText('projectHome.attention.failures.open') }}
						</N8nButton>
					</div>
				</div>
				<button :class="$style.viewAll" @click="openExecutions">
					{{ i18n.baseText('projectHome.attention.openAll') }}
				</button>
			</div>

			<!-- Reviews waiting on you (mocked) -->
			<div v-if="reviews.length > 0" :class="$style.bucket">
				<div :class="$style.bucketHeader">
					<N8nIcon icon="eye" color="text-base" />
					<N8nText bold>{{ i18n.baseText('projectHome.attention.reviews.title') }}</N8nText>
					<N8nTooltip :content="i18n.baseText('projectHome.attention.mocked.tooltip')">
						<span :class="$style.demoBadge">demo</span>
					</N8nTooltip>
				</div>
				<div
					v-for="review in reviews"
					:key="review.id"
					:class="[$style.row, review.waitingOn === 'others' && $style.muted]"
				>
					<div :class="$style.rowMain">
						<N8nText bold :class="$style.rowTitle">{{ review.workflowName }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ review.author }} · {{ timeAgo(review.requestedAt) }}
							<template v-if="review.waitingOn === 'others'"> · waiting on others</template>
						</N8nText>
					</div>
					<div v-if="review.waitingOn === 'you'" :class="$style.rowActions">
						<N8nButton size="small" type="secondary" @click="onApprove(review.id)">
							{{ i18n.baseText('projectHome.attention.reviews.approve') }}
						</N8nButton>
					</div>
				</div>
			</div>

			<!-- Ready to promote (mocked) -->
			<div v-if="promotions.length > 0" :class="$style.bucket">
				<div :class="$style.bucketHeader">
					<N8nIcon icon="rocket" color="text-base" />
					<N8nText bold>{{ i18n.baseText('projectHome.attention.promotions.title') }}</N8nText>
					<N8nTooltip :content="i18n.baseText('projectHome.attention.mocked.tooltip')">
						<span :class="$style.demoBadge">demo</span>
					</N8nTooltip>
				</div>
				<div v-for="promotion in promotions" :key="promotion.id" :class="$style.row">
					<div :class="$style.rowMain">
						<N8nText bold :class="$style.rowTitle">{{ promotion.workflowName }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ promotion.versionsAhead }} versions ahead of {{ promotion.target }} ·
							{{ promotion.changedBy }} · {{ timeAgo(promotion.lastChangedAt) }}
						</N8nText>
					</div>
					<div :class="$style.rowActions">
						<N8nButton size="small" type="secondary" @click="onPromote(promotion.id)">
							{{ i18n.baseText('projectHome.attention.promotions.action') }}
						</N8nButton>
					</div>
				</div>
			</div>

			<!-- Limits (mocked) -->
			<div v-if="limits.length > 0" :class="$style.bucket">
				<div :class="$style.bucketHeader">
					<N8nIcon icon="gauge" color="text-base" />
					<N8nText bold>{{ i18n.baseText('projectHome.attention.limits.title') }}</N8nText>
					<N8nTooltip :content="i18n.baseText('projectHome.attention.mocked.tooltip')">
						<span :class="$style.demoBadge">demo</span>
					</N8nTooltip>
				</div>
				<div v-for="limit in limits" :key="limit.id" :class="$style.row">
					<div :class="$style.rowMain">
						<N8nText size="small">
							{{
								i18n.baseText('projectHome.attention.limits.usage', {
									interpolate: {
										used: limit.used.toLocaleString(),
										limit: limit.limit.toLocaleString(),
										metric: limit.metric,
										period: limit.period,
									},
								})
							}}
						</N8nText>
						<div :class="$style.limitBar">
							<div
								:class="[
									$style.limitFill,
									limit.level === 'critical' ? $style.limitCritical : $style.limitWarning,
								]"
								:style="{ width: `${limitPercent(limit.used, limit.limit)}%` }"
							/>
						</div>
					</div>
					<N8nText bold size="small" :class="$style.limitPct">
						{{ limitPercent(limit.used, limit.limit) }}%
					</N8nText>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	margin-bottom: var(--spacing--lg);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

.empty {
	display: block;
	padding: var(--spacing--sm) 0;
}

.buckets {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
	gap: var(--spacing--sm);
}

.bucket {
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.bucketHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--3xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) 0;
	border-top: var(--border);
}

.muted {
	opacity: 0.6;
}

.rowMain {
	min-width: 0;
	flex: 1;
}

.rowTitle {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rowActions {
	display: flex;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.viewAll {
	align-self: flex-start;
	background: none;
	border: none;
	padding: 0;
	margin-top: var(--spacing--3xs);
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	cursor: pointer;
}

.limitBar {
	height: 6px;
	border-radius: 3px;
	background: var(--color--background);
	margin-top: var(--spacing--3xs);
	overflow: hidden;
}

.limitFill {
	height: 100%;
	border-radius: 3px;
}

.limitWarning {
	background: var(--color--warning);
}

.limitCritical {
	background: var(--color--danger);
}

.limitPct {
	flex-shrink: 0;
}

.demoBadge {
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	line-height: 1.4;
	padding: 0 var(--spacing--4xs);
	margin-left: auto;
}
</style>
