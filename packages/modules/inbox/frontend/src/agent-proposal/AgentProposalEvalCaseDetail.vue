<script setup lang="ts">
import type { AgentProposalCaseArm, AgentProposalCaseResult } from '@n8n/api-types';
import { N8nAiActivityStep, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AgentProposalArmStatus from './AgentProposalArmStatus.vue';
import { splitExpectedTools } from './agentProposalChangeFields';
import { armStatus, formatToolData } from './agentProposalEvalCases';

const props = defineProps<{ result: AgentProposalCaseResult }>();

const i18n = useI18n();

const costFormat = new Intl.NumberFormat(undefined, {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 4,
});

function usageRows({ usage }: AgentProposalCaseArm) {
	const rows: Array<{ key: string; label: string; value: string }> = [];
	if (usage.inputTokens !== null) {
		rows.push({
			key: 'inputTokens',
			label: i18n.baseText('inbox.agentProposal.evals.usage.inputTokens'),
			value: usage.inputTokens.toLocaleString(),
		});
	}
	if (usage.outputTokens !== null) {
		rows.push({
			key: 'outputTokens',
			label: i18n.baseText('inbox.agentProposal.evals.usage.outputTokens'),
			value: usage.outputTokens.toLocaleString(),
		});
	}
	if (usage.costUsd !== null) {
		rows.push({
			key: 'cost',
			label: i18n.baseText('inbox.agentProposal.evals.usage.cost'),
			value: costFormat.format(usage.costUsd),
		});
	}
	if (usage.durationMs !== null) {
		rows.push({
			key: 'latency',
			label: i18n.baseText('inbox.agentProposal.evals.usage.latency'),
			value: i18n.baseText('inbox.agentProposal.evals.usage.latencyValue', {
				interpolate: { seconds: (usage.durationMs / 1000).toFixed(1) },
			}),
		});
	}
	return rows;
}

function toColumn(key: 'published' | 'proposed' | 'current', arm: AgentProposalCaseArm) {
	return {
		key,
		label: i18n.baseText(`inbox.agentProposal.evals.version.${key}`),
		arm,
		status: armStatus(arm),
		usage: usageRows(arm),
	};
}

/* A proposal without an agent edit has one version: the current agent. */
const columns = computed(() =>
	props.result.proposed
		? [toColumn('published', props.result.published), toColumn('proposed', props.result.proposed)]
		: [toColumn('current', props.result.published)],
);

const checks = computed(() => {
	const { required, forbidden } = splitExpectedTools(props.result.expectedTools);
	return [
		{
			key: 'rule',
			label: i18n.baseText('inbox.agentProposal.evals.detail.rule'),
			value: props.result.criteria,
		},
		{
			key: 'expected-answer',
			label: i18n.baseText('inbox.agentProposal.evals.detail.expectedAnswer'),
			value: props.result.expectedOutput,
		},
		{
			key: 'must-call',
			label: i18n.baseText('inbox.agentProposal.evals.detail.mustCall'),
			value: required.join(', '),
		},
		{
			key: 'must-not-call',
			label: i18n.baseText('inbox.agentProposal.evals.detail.mustNotCall'),
			value: forbidden.join(', '),
		},
	].filter(({ value }) => value);
});
</script>

<template>
	<div :class="$style.detail" data-test-id="agent-proposal-eval-detail">
		<!-- Both versions get the same input and the same checks, so these show one time. -->
		<dl :class="$style.shared">
			<div :class="$style.block" data-test-id="agent-proposal-eval-input">
				<N8nText tag="dt" step="2xs" bold color="text-base">
					{{ i18n.baseText('inbox.agentProposal.evals.detail.input') }}
				</N8nText>
				<N8nText tag="dd" step="xs" color="text-dark" :class="$style.text">
					{{ result.input }}
				</N8nText>
			</div>
			<div
				v-for="check in checks"
				:key="check.key"
				:class="$style.block"
				:data-test-id="`agent-proposal-eval-${check.key}`"
			>
				<N8nText tag="dt" step="2xs" bold color="text-base">{{ check.label }}</N8nText>
				<N8nText tag="dd" step="xs" color="text-dark" :class="$style.text">
					{{ check.value }}
				</N8nText>
			</div>
		</dl>
		<div :class="$style.columns">
			<section
				v-for="column in columns"
				:key="column.key"
				:class="$style.column"
				:aria-label="column.label"
				:data-test-id="`agent-proposal-eval-version-${column.key}`"
			>
				<header :class="$style.columnHeader">
					<N8nText tag="h4" step="xs" bold color="text-dark" :class="$style.heading">
						{{ column.label }}
					</N8nText>
					<AgentProposalArmStatus :status="column.status" />
				</header>

				<div :class="$style.block">
					<N8nText step="2xs" bold color="text-base">
						{{ i18n.baseText('inbox.agentProposal.evals.detail.answer') }}
					</N8nText>
					<N8nText
						v-if="column.arm.answer"
						tag="p"
						step="xs"
						color="text-dark"
						:class="$style.text"
						data-test-id="agent-proposal-eval-answer"
					>
						{{ column.arm.answer }}
					</N8nText>
					<N8nText v-else step="xs" color="text-light">
						{{
							i18n.baseText(
								column.arm.status === 'error'
									? 'inbox.agentProposal.evals.detail.runError'
									: 'inbox.agentProposal.evals.detail.noAnswer',
							)
						}}
					</N8nText>
				</div>

				<div :class="$style.block" data-test-id="agent-proposal-eval-verdict">
					<N8nText step="2xs" bold color="text-base">
						{{ i18n.baseText('inbox.agentProposal.evals.detail.verdict') }}
					</N8nText>
					<N8nText
						v-if="column.arm.verdict.reasoning"
						tag="p"
						step="xs"
						color="text-dark"
						:class="$style.text"
					>
						{{ column.arm.verdict.reasoning }}
					</N8nText>
					<N8nText v-else step="xs" color="text-light">
						{{ i18n.baseText('inbox.agentProposal.evals.detail.noReasoning') }}
					</N8nText>
					<template v-if="column.arm.verdict.toolCheck">
						<N8nText
							v-if="column.arm.verdict.toolCheck.pass"
							step="xs"
							color="text-dark"
							data-test-id="agent-proposal-eval-tool-check-pass"
						>
							{{ i18n.baseText('inbox.agentProposal.evals.detail.toolCheck.pass') }}
						</N8nText>
						<N8nText
							v-if="column.arm.verdict.toolCheck.missing.length > 0"
							step="xs"
							color="danger"
							:class="$style.text"
							data-test-id="agent-proposal-eval-tool-check-missing"
						>
							{{
								i18n.baseText('inbox.agentProposal.evals.detail.toolCheck.missing', {
									interpolate: { tools: column.arm.verdict.toolCheck.missing.join(', ') },
								})
							}}
						</N8nText>
						<N8nText
							v-if="column.arm.verdict.toolCheck.forbidden.length > 0"
							step="xs"
							color="danger"
							:class="$style.text"
							data-test-id="agent-proposal-eval-tool-check-forbidden"
						>
							{{
								i18n.baseText('inbox.agentProposal.evals.detail.toolCheck.forbidden', {
									interpolate: { tools: column.arm.verdict.toolCheck.forbidden.join(', ') },
								})
							}}
						</N8nText>
					</template>
				</div>

				<div :class="$style.block" data-test-id="agent-proposal-eval-tool-calls">
					<N8nText step="2xs" bold color="text-base">
						{{ i18n.baseText('inbox.agentProposal.evals.detail.toolCalls') }}
					</N8nText>
					<N8nText v-if="column.arm.toolCalls.length === 0" step="xs" color="text-light">
						{{ i18n.baseText('inbox.agentProposal.evals.detail.noToolCalls') }}
					</N8nText>
					<!-- The error text of a tool call is internal, so a failed call shows a generic label. -->
					<N8nAiActivityStep
						v-for="(call, index) in column.arm.toolCalls"
						:key="index"
						:label="call.tool"
						:error="
							call.failed ? i18n.baseText('inbox.agentProposal.evals.detail.toolFailed') : undefined
						"
						:has-content="call.failed || call.input !== undefined || call.output !== undefined"
						data-test-id="agent-proposal-eval-tool-call"
					>
						<div v-if="call.input !== undefined" :class="$style.toolData">
							<N8nText step="2xs" color="text-light">
								{{ i18n.baseText('inbox.agentProposal.evals.detail.toolInput') }}
							</N8nText>
							<pre :class="$style.pre">{{ formatToolData(call.input) }}</pre>
						</div>
						<div v-if="call.output !== undefined" :class="$style.toolData">
							<N8nText step="2xs" color="text-light">
								{{ i18n.baseText('inbox.agentProposal.evals.detail.toolOutput') }}
							</N8nText>
							<pre :class="$style.pre">{{ formatToolData(call.output) }}</pre>
						</div>
					</N8nAiActivityStep>
				</div>

				<dl v-if="column.usage.length > 0" :class="$style.usage">
					<div
						v-for="row in column.usage"
						:key="row.key"
						:class="$style.usageRow"
						:data-test-id="`agent-proposal-eval-usage-${row.key}`"
					>
						<N8nText tag="dt" step="2xs" color="text-light">{{ row.label }}</N8nText>
						<N8nText tag="dd" step="2xs" color="text-dark">{{ row.value }}</N8nText>
					</div>
				</dl>
			</section>
		</div>
	</div>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
	background-color: var(--background--subtle);
}

.shared {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
}

.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;

	dd {
		margin: 0;
	}
}

.text {
	margin: 0;
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.columns {
	display: grid;
	grid-auto-columns: minmax(0, 1fr);
	grid-auto-flow: column;
	gap: var(--spacing--sm);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}

.columnHeader {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.heading {
	margin: 0;
}

.toolData {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-top: var(--spacing--3xs);
}

.pre {
	max-height: 12rem;
	margin: 0;
	padding: var(--spacing--2xs);
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--subtle);
	font-size: var(--font-size--2xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.usage {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs) var(--spacing--sm);
	margin: 0;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}

.usageRow {
	display: flex;
	gap: var(--spacing--4xs);

	dd {
		margin: 0;
	}
}

/* The container is the root of AgentProposalEvalResults. */
@container agent-proposal-evals (max-width: 40rem) {
	.columns {
		grid-auto-flow: row;
	}
}
</style>
