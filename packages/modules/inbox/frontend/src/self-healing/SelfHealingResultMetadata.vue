<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import {
	N8nAssistantAvatar,
	N8nCard,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTimeAgo,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

const props = defineProps<{
	detail: SelfHealingResultDetail;
	workflowName: string;
	statusLabel: string;
}>();
const i18n = useI18n();
const rootStore = useRootStore();

const usageRows = computed(() => {
	const usage = props.detail.usage;
	const measurements =
		'credits' in usage
			? [
					{
						key: 'credits',
						label: i18n.baseText('inbox.selfHealing.usage.credits'),
						value: usage.credits,
					},
				]
			: [
					{
						key: 'promptTokens',
						label: i18n.baseText('inbox.selfHealing.usage.promptTokens'),
						value: usage.promptTokens,
					},
					{
						key: 'completionTokens',
						label: i18n.baseText('inbox.selfHealing.usage.completionTokens'),
						value: usage.completionTokens,
					},
					{
						key: 'totalTokens',
						label: i18n.baseText('inbox.selfHealing.usage.totalTokens'),
						value: usage.totalTokens,
					},
				];

	const rows = measurements.flatMap((row) => {
		if (row.value === null) return [];

		return [{ ...row, value: row.value.toLocaleString(rootStore.defaultLocale) }];
	});

	if (usage.durationSeconds !== null) {
		rows.push({
			key: 'duration',
			label: i18n.baseText('inbox.selfHealing.usage.duration'),
			value: i18n.baseText('inbox.selfHealing.usage.durationValue', {
				interpolate: {
					minutes: String(Math.floor(usage.durationSeconds / 60)),
					seconds: String(Math.floor(usage.durationSeconds % 60)),
				},
			}),
		});
	}

	return rows;
});
</script>

<template>
	<aside :class="$style.metadata" data-test-id="self-healing-metadata">
		<N8nCard :class="$style.card" data-test-id="self-healing-status-card">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.status')
				}}</N8nText>
			</template>
			<N8nText size="medium">{{ statusLabel }}</N8nText>
		</N8nCard>
		<N8nCard :class="[$style.card, $style.peopleCard]">
			<div :class="$style.section">
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.createdBy')
				}}</N8nText>
				<div :class="$style.person">
					<N8nAssistantAvatar size="small" />
					<N8nText size="medium">{{
						i18n.baseText('inbox.selfHealing.metadata.assistant')
					}}</N8nText>
				</div>
			</div>
			<div :class="$style.section">
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.completed')
				}}</N8nText>
				<N8nText size="medium">
					<time :datetime="detail.completedAt"
						><N8nTimeAgo :date="detail.completedAt" :locale="rootStore.defaultLocale"
					/></time>
				</N8nText>
			</div>
		</N8nCard>
		<N8nCard :class="$style.card">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.workflow')
				}}</N8nText>
			</template>
			<div :class="$style.section">
				<N8nLink
					:to="{ name: VIEWS.WORKFLOW, params: { workflowId: detail.workflowId } }"
					theme="text"
					size="medium"
					:underline="false"
					:class="$style.plainLink"
					data-test-id="self-healing-workflow-link"
				>
					<span :class="$style.link">
						<N8nIcon icon="workflow" size="medium" :class="$style.workflowIcon" />
						<span :class="$style.workflowName">{{ workflowName }}</span>
					</span>
				</N8nLink>
			</div>
			<div :class="$style.section">
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.execution')
				}}</N8nText>
				<N8nLink
					v-if="detail.execution.status === 'available'"
					:to="{
						name: VIEWS.EXECUTION_PREVIEW,
						params: { workflowId: detail.workflowId, executionId: detail.execution.id },
					}"
					theme="text"
					size="medium"
					:underline="false"
					:class="$style.plainLink"
					data-test-id="self-healing-execution-link"
				>
					{{
						i18n.baseText('inbox.selfHealing.metadata.executionLink', {
							interpolate: { id: detail.execution.id },
						})
					}}
				</N8nLink>
				<N8nText
					v-else
					size="small"
					color="text-light"
					data-test-id="self-healing-execution-unavailable"
				>
					{{ i18n.baseText('inbox.selfHealing.metadata.executionUnavailable') }}
				</N8nText>
			</div>
		</N8nCard>
		<N8nCard v-if="usageRows.length" :class="$style.card" data-test-id="self-healing-usage">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.usage.title')
				}}</N8nText>
			</template>
			<dl :class="$style.usage">
				<div
					v-for="row in usageRows"
					:key="row.key"
					:class="$style.measurement"
					:data-test-id="`self-healing-usage-${row.key}`"
				>
					<N8nText tag="dt" size="small" color="text-light">{{ row.label }}</N8nText>
					<N8nText tag="dd" size="small">{{ row.value }}</N8nText>
				</div>
			</dl>
		</N8nCard>
	</aside>
</template>

<style module lang="scss">
.metadata {
	display: flex;
	/* Match the prototype's metadata rail. The design system has no column-width token. */
	flex: 0 0 min(18rem, 30%);
	min-width: 14rem;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--5xs);
	overflow: auto;
}

.card {
	--card--padding: var(--spacing--xs);
	--n8n--card-body--gap: var(--spacing--2xs);
	align-items: stretch;
	border-color: var(--border-color);
	background-color: transparent;

	> div {
		gap: var(--spacing--4xs);
	}
}

.peopleCard {
	--n8n--card-body--gap: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.person,
.link {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.link {
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.plainLink:hover,
.plainLink:focus-visible {
	text-decoration: underline;
}

.workflowIcon {
	flex-shrink: 0;
	/* Align the icon with the first line, as in the prototype. */
	margin-top: calc((1lh - 1em) / 2);
}

.workflowName {
	white-space: normal;
	overflow-wrap: anywhere;
}

.usage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
}

.measurement {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);

	dd {
		margin: 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
}

/* Match the prototype's sidebar widths. There are no column-width tokens. */
@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

/* Match the prototype's detail breakpoint. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.metadata {
		flex: 0 0 auto;
		min-width: 0;
		overflow: visible;
	}
}
</style>
