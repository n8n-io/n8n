<script setup lang="ts">
import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { N8nAssistantAvatar, N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { AGENT_VIEW } from '@n8n/frontend-constants/agents';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

const props = defineProps<{
	detail: SelfHealingAgentResultDetail;
	statusLabel: string;
	statusClass: 'open' | 'closed';
}>();
const i18n = useI18n();
const rootStore = useRootStore();

function formatDate(value: string) {
	return new Date(value).toLocaleString(rootStore.defaultLocale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

const goals = computed(() =>
	props.detail.goals.map((goal) => i18n.baseText(`inbox.agentProposal.goal.${goal}`)).join(', '),
);

const traceWindow = computed(() => {
	const { start, end } = props.detail.traceWindow;
	return start === null
		? i18n.baseText('inbox.agentProposal.metadata.traceWindow.until', {
				interpolate: { end: formatDate(end) },
			})
		: i18n.baseText('inbox.agentProposal.metadata.traceWindow.range', {
				interpolate: { start: formatDate(start), end: formatDate(end) },
			});
});

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
	<aside :class="$style.metadata" data-test-id="agent-proposal-metadata">
		<N8nCard :class="$style.card" data-test-id="agent-proposal-status-card">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.selfHealing.metadata.status')
				}}</N8nText>
			</template>
			<div :class="$style.status">
				<span :class="[$style.statusDot, $style[statusClass]]" aria-hidden="true" />
				<N8nText size="medium">{{ statusLabel }}</N8nText>
			</div>
		</N8nCard>
		<N8nCard :class="$style.card">
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
		</N8nCard>
		<N8nCard :class="$style.card">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.agentProposal.metadata.agent')
				}}</N8nText>
			</template>
			<div :class="$style.section">
				<N8nLink
					:to="{
						name: AGENT_VIEW,
						params: { projectId: detail.projectId, agentId: detail.agentId },
					}"
					theme="text"
					size="medium"
					:underline="false"
					:class="$style.plainLink"
					data-test-id="agent-proposal-agent-link"
				>
					<span :class="$style.link">
						<N8nIcon icon="robot" size="medium" :class="$style.linkIcon" />
						<span :class="$style.linkLabel">{{ detail.agentName }}</span>
					</span>
				</N8nLink>
			</div>
			<div
				v-if="detail.baseVersionPublishedAt"
				:class="$style.section"
				data-test-id="agent-proposal-base-version"
			>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.agentProposal.metadata.baseVersion')
				}}</N8nText>
				<N8nText size="medium">{{
					i18n.baseText('inbox.agentProposal.metadata.baseVersion.published', {
						interpolate: { date: formatDate(detail.baseVersionPublishedAt) },
					})
				}}</N8nText>
			</div>
		</N8nCard>
		<N8nCard :class="$style.card" data-test-id="agent-proposal-investigation">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.agentProposal.metadata.investigation')
				}}</N8nText>
			</template>
			<dl :class="$style.usage">
				<div :class="$style.measurement">
					<N8nText tag="dt" size="medium">{{
						i18n.baseText('inbox.agentProposal.metadata.goal')
					}}</N8nText>
					<N8nText tag="dd" size="medium" data-test-id="agent-proposal-goals">{{ goals }}</N8nText>
				</div>
				<div :class="$style.measurement">
					<N8nText tag="dt" size="medium">{{
						i18n.baseText('inbox.agentProposal.metadata.trigger')
					}}</N8nText>
					<N8nText tag="dd" size="medium">{{
						i18n.baseText(`inbox.agentProposal.trigger.${detail.trigger}`)
					}}</N8nText>
				</div>
				<div :class="$style.measurement">
					<N8nText tag="dt" size="medium">{{
						i18n.baseText('inbox.agentProposal.metadata.traces')
					}}</N8nText>
					<N8nText tag="dd" size="medium">{{
						detail.traceWindow.count.toLocaleString(rootStore.defaultLocale)
					}}</N8nText>
				</div>
			</dl>
			<N8nText size="small" color="text-light" data-test-id="agent-proposal-trace-window">{{
				traceWindow
			}}</N8nText>
		</N8nCard>
		<N8nCard v-if="usageRows.length" :class="$style.card" data-test-id="agent-proposal-usage">
			<template #header>
				<N8nText bold color="text-light" size="medium">{{
					i18n.baseText('inbox.agentProposal.metadata.cost')
				}}</N8nText>
			</template>
			<dl :class="$style.usage">
				<div
					v-for="row in usageRows"
					:key="row.key"
					:class="$style.measurement"
					:data-test-id="`agent-proposal-usage-${row.key}`"
				>
					<N8nText tag="dt" size="medium">{{ row.label }}</N8nText>
					<N8nText tag="dd" size="medium">{{ row.value }}</N8nText>
				</div>
			</dl>
		</N8nCard>
	</aside>
</template>

<style module lang="scss">
.metadata {
	display: flex;
	/* Match the metadata rail of an Assistant result. The design system has no column-width token. */
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

	/* Match the title-to-value gap of the sections inside the card body. */
	> div {
		gap: var(--spacing--2xs);
	}
}

/* Match the status row of workflow reviews. */
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.statusDot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.open {
	background-color: var(--color--blue-500);
}

.closed {
	background-color: var(--color--neutral-500);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

/* Each later group in a card gets the same space above its title. */
.section + .section {
	margin-top: var(--spacing--2xs);
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
	gap: var(--spacing--3xs);
}

/* The text link theme uses a lighter shade. Values in this rail use the regular text color. */
.plainLink .link {
	color: var(--text-color);
}

.plainLink:hover,
.plainLink:focus-visible {
	text-decoration: underline;
}

.linkIcon {
	flex-shrink: 0;
	/* Align the icon with the first line. */
	margin-top: calc((1lh - 1em) / 2);
}

.linkLabel {
	white-space: normal;
	overflow-wrap: anywhere;
}

.usage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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

/* Match the sidebar widths of an Assistant result. There are no column-width tokens. */
@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

/* Match the detail breakpoint of an Assistant result. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.metadata {
		flex: 0 0 auto;
		min-width: 0;
		overflow: visible;
	}
}
</style>
