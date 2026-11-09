<script setup lang="ts">
/**
 * The code checks on live sessions of the published agent, above the session
 * list: for each check, the sessions where it failed since this version went
 * live (30 days at most), beside the last version's count. Counts, never rates.
 * "More often" shows only when the server's significance test holds, so a
 * small count never raises it. Nothing shows for an agent with no published
 * checks, or when the counts can't be read.
 */
import { onMounted, ref } from 'vue';
import { N8nBadge, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getLiveChecks } from '../agentEvals.api';
import type { AgentLiveChecksReport } from '../agentEvals.types';

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const report = ref<AgentLiveChecksReport | null>(null);

onMounted(async () => {
	try {
		report.value = await getLiveChecks(rootStore.restApiContext, props.projectId, props.agentId);
	} catch {
		// The counts are extra; the session list reads the same without them.
	}
});

function sinceDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<template>
	<section
		v-if="report && report.checks.length > 0"
		:class="$style.summary"
		data-test-id="agent-live-checks"
	>
		<div :class="$style.header">
			<N8nText size="small" color="text-dark" bold>
				{{ i18n.baseText('agents.liveChecks.title') }}
			</N8nText>
			<N8nText v-if="report.current" size="small" color="text-light">
				{{
					i18n.baseText('agents.liveChecks.window', {
						interpolate: { date: sinceDate(report.current.since) },
					})
				}}
			</N8nText>
		</div>
		<N8nText
			v-if="!report.current"
			size="small"
			color="text-light"
			data-test-id="agent-live-checks-empty"
		>
			{{ i18n.baseText('agents.liveChecks.empty') }}
		</N8nText>
		<ul v-else :class="$style.rows">
			<li
				v-for="check in report.checks"
				:key="check.checkId"
				:class="$style.row"
				data-test-id="agent-live-check-row"
			>
				<N8nText size="small" color="text-base" :class="$style.question">
					{{ check.question }}
				</N8nText>
				<N8nText size="small" :color="check.failed > 0 ? 'text-dark' : 'text-light'">
					{{
						i18n.baseText('agents.liveChecks.count', {
							interpolate: {
								failed: String(check.failed),
								sessions: String(report.current.sessions),
							},
						})
					}}
				</N8nText>
				<N8nText
					v-if="report.previous && check.prevFailed !== null"
					size="small"
					color="text-light"
				>
					{{
						i18n.baseText('agents.liveChecks.lastVersion', {
							interpolate: {
								failed: String(check.prevFailed),
								sessions: String(report.previous.sessions),
							},
						})
					}}
				</N8nText>
				<N8nBadge
					v-if="check.moreOften"
					variant="warning"
					data-test-id="agent-live-check-more-often"
				>
					{{ i18n.baseText('agents.liveChecks.moreOften') }}
				</N8nBadge>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	min-width: 0;
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.question {
	flex: 1 1 16rem;
	min-width: 0;
}
</style>
