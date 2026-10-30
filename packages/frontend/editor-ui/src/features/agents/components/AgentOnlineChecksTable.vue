<script setup lang="ts">
import type { AgentOnlineActivityItem, AgentOnlineRubric } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** The checks of a rubric, with when each applies and its five latest verdicts. */
const props = defineProps<{ rubric: AgentOnlineRubric; activity: AgentOnlineActivityItem[] }>();

const i18n = useI18n();

/** The question without the "Did the agent" the column header already says. */
const checkText = (question: string) => question.replace(/^did the agent\s+/i, '…');

type DotStatus = 'good' | 'bad' | 'review' | 'none';
/** This check's verdicts in the five latest assessments, oldest first. */
function lastFive(checkId: string): DotStatus[] {
	return props.activity
		.map((item) => item.result.verdicts.find((verdict) => verdict.checkId === checkId)?.status)
		.filter((status) => status !== undefined)
		.slice(0, 5)
		.reverse()
		.map((status) =>
			status === 'pass'
				? 'good'
				: status === 'fail'
					? 'bad'
					: status === 'not_applicable'
						? 'none'
						: 'review',
		);
}
</script>

<template>
	<div :class="$style.wrap">
		<table :class="$style.table" data-testid="agent-online-checks-table">
			<thead>
				<tr>
					<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.check') }}</th>
					<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.appliesWhen') }}</th>
					<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.lastFive') }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="check in rubric.checks" :key="check.id">
					<td>
						<N8nText size="small" color="text-dark" bold>{{ checkText(check.question) }}</N8nText>
					</td>
					<td>
						<N8nText size="small" color="text-base">{{
							check.appliesWhen || i18n.baseText('agents.builder.agentEvals.replay.table.always')
						}}</N8nText>
					</td>
					<td>
						<span :class="$style.dots">
							<span
								v-for="(status, index) in lastFive(check.id)"
								:key="index"
								:class="[$style.dot, $style[status]]"
								aria-hidden="true"
							/>
						</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style lang="scss" module>
.wrap {
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
	th {
		color: var(--text-color--subtler);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--regular);
	}
	th,
	td {
		padding: var(--spacing--sm);
		vertical-align: middle;
	}
	tbody tr {
		border-top: var(--border-width) var(--border-style) var(--border-color);
	}
	td:first-child {
		width: 55%;
	}
	th:last-child,
	td:last-child {
		white-space: nowrap;
	}
}
.dots {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
.dot {
	display: inline-block;
	flex: none;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: currentColor;
}
.good {
	color: var(--color--success);
}
.review {
	color: var(--color--warning);
}
.bad {
	color: var(--color--danger);
}
.none {
	color: var(--text-color--subtler);
}
</style>
