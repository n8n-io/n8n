<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import { N8nAssistantAvatar, N8nIcon, N8nLink, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

import InboxAvatarTooltip from '../../../components/InboxAvatarTooltip.vue';
import PrototypeStatusMenu from '../../PrototypeStatusMenu.vue';
import { prototypeSession, prototypeState } from '../../prototype.session';

const props = defineProps<{
	detail: SelfHealingResultDetail;
	workflowName: string;
	statusLabel: string;
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const inboxState = computed(() =>
	prototypeState(props.detail.resultId, props.detail.reviewState === 'open' ? 'open' : 'closed'),
);
const outcomeLabel = computed(() => {
	switch (props.detail.outcome) {
		case 'fix_ready':
			return i18n.baseText('inbox.outcome.fixReady');
		case 'needs_you':
			return i18n.baseText('inbox.outcome.needsAttention');
		case 'could_not_fix':
			return i18n.baseText('inbox.outcome.couldNotFix');
	}
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
	<aside :class="$style.metadata" data-test-id="self-healing-metadata">
		<section :class="$style.section" data-test-id="self-healing-status-card">
			<N8nText bold color="text-light" size="medium">{{
				i18n.baseText('inbox.selfHealing.metadata.status')
			}}</N8nText>
			<PrototypeStatusMenu
				v-if="prototypeSession.active"
				:item-id="detail.resultId"
				:state="inboxState"
				:open-label="outcomeLabel"
			>
				<span
					:class="[
						$style.dot,
						inboxState === 'closed'
							? $style.dotClosed
							: detail.outcome === 'needs_you'
								? $style.dotAttention
								: $style.dotOpen,
					]"
				/>
			</PrototypeStatusMenu>
			<N8nText v-else size="medium">{{ statusLabel }}</N8nText>
		</section>
		<section :class="$style.section">
			<N8nText bold color="text-light" size="medium">{{
				i18n.baseText('inbox.selfHealing.metadata.createdBy')
			}}</N8nText>
			<div :class="$style.person">
				<InboxAvatarTooltip :name="i18n.baseText('inbox.selfHealing.metadata.assistant')">
					<N8nAssistantAvatar size="small" />
				</InboxAvatarTooltip>
				<N8nText size="medium">{{ i18n.baseText('inbox.selfHealing.metadata.assistant') }}</N8nText>
			</div>
		</section>
		<section :class="$style.section">
			<N8nText bold color="text-light" size="medium">{{
				i18n.baseText('inbox.selfHealing.metadata.completed')
			}}</N8nText>
			<N8nText size="medium">
				<time :datetime="detail.completedAt"
					><N8nTimeAgo :date="detail.completedAt" :locale="rootStore.defaultLocale"
				/></time>
			</N8nText>
		</section>
		<section :class="$style.section">
			<N8nText bold color="text-light" size="medium">{{
				i18n.baseText('inbox.selfHealing.metadata.workflow')
			}}</N8nText>
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
		</section>
		<section :class="$style.section">
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
		</section>
		<section v-if="usageRows.length" :class="$style.section" data-test-id="self-healing-usage">
			<N8nText bold color="text-light" size="medium">{{
				i18n.baseText('inbox.selfHealing.usage.title')
			}}</N8nText>
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
		</section>
	</aside>
</template>

<style module lang="scss">
.metadata {
	position: sticky;
	top: 0;
	align-self: flex-start;
	display: flex;
	/* Match the review metadata column. The design system has no column-width token. */
	flex: 0 0 min(18rem, 30%);
	min-width: 14rem;
	flex-direction: column;
	gap: var(--spacing--lg);
	margin-top: var(--spacing--5xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.dotOpen {
	background-color: var(--color--blue-500);
}

.dotAttention {
	background-color: var(--color--yellow-500);
}

.dotClosed {
	background-color: var(--color--neutral-500);
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
	/* Align the icon with the first line, as in the review column. */
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

@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

/* Match the review detail breakpoint. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.metadata {
		flex: 0 0 auto;
		min-width: 0;
		overflow: visible;
	}
}
</style>
