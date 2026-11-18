<script setup lang="ts">
import type { AgentProposalCaseArm, AgentProposalCaseResult } from '@n8n/api-types';
import { N8nAiActivityStep, N8nButton, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import AgentProposalArmStatus from './AgentProposalArmStatus.vue';
import {
	armChecks,
	armStatus,
	forbiddenCalls,
	formatToolData,
	type AgentProposalArmCheck,
} from './agentProposalEvalCases';

const props = defineProps<{ result: AgentProposalCaseResult }>();

const i18n = useI18n();

/* One toggle opens both versions, so their answers stay side by side. */
const expanded = ref(false);

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
	const forbidden = forbiddenCalls(arm);
	return {
		key,
		label: i18n.baseText(`inbox.agentProposal.evals.version.${key}`),
		arm,
		status: armStatus(arm),
		checks: arm.status === 'error' ? [runErrorRow()] : armChecks(props.result, arm).map(toCheckRow),
		forbiddenCalls: forbidden,
		/* The checklist already lists the expected tools, so only the calls that went wrong show here. */
		flaggedCalls: arm.toolCalls.filter((call) => call.failed || forbidden.has(call.tool)),
		usage: usageRows(arm),
	};
}

/* A proposal without an agent edit has one version: the current agent. */
const columns = computed(() =>
	props.result.proposed
		? [toColumn('published', props.result.published), toColumn('proposed', props.result.proposed)]
		: [toColumn('current', props.result.published)],
);

/* Both versions get the same rule, so it shows one time above the versions. */
const caseChecks = computed(() =>
	[
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
	].filter(({ value }) => value),
);

type CheckTone = 'pass' | 'fail' | 'muted' | 'warning';

const checkIcons: Record<CheckTone, IconName> = {
	pass: 'circle-check',
	fail: 'circle-x',
	muted: 'circle-minus',
	warning: 'circle-alert',
};

const ruleTones: Record<Extract<AgentProposalArmCheck, { kind: 'rule' }>['state'], CheckTone> = {
	pass: 'pass',
	fail: 'fail',
	notChecked: 'muted',
	error: 'warning',
};

function runErrorRow() {
	return {
		key: 'run',
		tone: 'warning' satisfies CheckTone,
		icon: checkIcons.warning,
		label: i18n.baseText('inbox.agentProposal.evals.detail.runError'),
		detail: null,
	};
}

function toolCheckLabel(check: Extract<AgentProposalArmCheck, { kind: 'tool' }>) {
	const interpolate = { tool: check.tool };
	if (check.expectation === 'required') {
		return check.pass
			? i18n.baseText('inbox.agentProposal.evals.check.called', { interpolate })
			: i18n.baseText('inbox.agentProposal.evals.check.missing', { interpolate });
	}
	return check.pass
		? i18n.baseText('inbox.agentProposal.evals.check.notCalled', { interpolate })
		: i18n.baseText('inbox.agentProposal.evals.check.forbidden', { interpolate });
}

function toCheckRow(check: AgentProposalArmCheck) {
	if (check.kind === 'tool') {
		const tone: CheckTone = check.pass ? 'pass' : 'fail';
		return {
			key: `${check.expectation}-${check.tool}`,
			tone,
			icon: checkIcons[tone],
			label: toolCheckLabel(check),
			detail: null,
		};
	}
	const tone = ruleTones[check.state];
	return {
		key: 'rule',
		tone,
		icon: checkIcons[tone],
		label: i18n.baseText(`inbox.agentProposal.evals.check.rule.${check.state}`),
		// A passing rule needs no explanation. A failing rule shows why it failed.
		detail: check.state === 'fail' ? check.reasoning : null,
	};
}
</script>

<template>
	<div :class="$style.detail" data-test-id="agent-proposal-eval-detail">
		<!-- Both versions get the same input and the same rule, so these show one time. -->
		<dl v-if="caseChecks.length > 0" :class="$style.checks">
			<div
				v-for="check in caseChecks"
				:key="check.key"
				:class="$style.check"
				:data-test-id="`agent-proposal-eval-${check.key}`"
			>
				<N8nText tag="dt" step="2xs" bold color="text-base">{{ check.label }}</N8nText>
				<N8nText tag="dd" step="xs" color="text-dark" :class="$style.text">
					{{ check.value }}
				</N8nText>
			</div>
		</dl>

		<div
			:class="[$style.bubble, $style.userBubble]"
			:aria-label="i18n.baseText('inbox.agentProposal.evals.detail.input')"
			data-test-id="agent-proposal-eval-input"
		>
			<N8nText step="xs" color="text-dark" :class="$style.text">{{ result.input }}</N8nText>
		</div>

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

				<ul
					v-if="column.checks.length > 0"
					:class="$style.checklist"
					data-test-id="agent-proposal-eval-checklist"
				>
					<li
						v-for="check in column.checks"
						:key="check.key"
						:class="[$style.checkRow, $style[check.tone]]"
						:data-tone="check.tone"
						:data-test-id="`agent-proposal-eval-check-${check.key}`"
					>
						<N8nIcon :icon="check.icon" size="small" :class="$style.checkIcon" />
						<span :class="$style.checkText">
							<N8nText step="xs" :bold="check.tone === 'fail'" :class="$style.checkLabel">
								{{ check.label }}
							</N8nText>
							<N8nText v-if="check.detail" step="2xs" color="text-base" :class="$style.text">
								{{ check.detail }}
							</N8nText>
						</span>
					</li>
				</ul>

				<template v-if="expanded">
					<div :class="$style.conversation">
						<div
							v-if="column.flaggedCalls.length > 0"
							:class="$style.toolCalls"
							data-test-id="agent-proposal-eval-tool-calls"
						>
							<!-- The error text of a tool call is internal, so a failed call shows a generic label. -->
							<N8nAiActivityStep
								v-for="(call, index) in column.flaggedCalls"
								:key="index"
								:label="call.tool"
								:error="
									call.failed
										? i18n.baseText('inbox.agentProposal.evals.detail.toolFailed')
										: undefined
								"
								:has-content="call.failed || call.input !== undefined || call.output !== undefined"
								data-test-id="agent-proposal-eval-tool-call"
							>
								<template v-if="column.forbiddenCalls.has(call.tool)" #prefix>
									<N8nIcon
										icon="circle-x"
										color="danger"
										size="small"
										:aria-label="i18n.baseText('inbox.agentProposal.evals.check.forbiddenStep')"
										data-test-id="agent-proposal-eval-tool-call-forbidden"
									/>
								</template>
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

						<div :class="[$style.bubble, $style.agentBubble]">
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
				</template>

				<N8nButton
					variant="ghost"
					size="small"
					:class="$style.toggle"
					:aria-expanded="expanded"
					data-test-id="agent-proposal-eval-version-toggle"
					@click="expanded = !expanded"
				>
					{{
						i18n.baseText(
							expanded
								? 'inbox.agentProposal.evals.detail.hideDetails'
								: 'inbox.agentProposal.evals.detail.showDetails',
						)
					}}
					<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" />
				</N8nButton>
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

.checks {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs) var(--spacing--lg);
	margin: 0;
}

.check {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	max-width: 100%;

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

/* The chat bubbles of the Agent Evals screen: the user is on the right, the agent on the left. */
.bubble {
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background-color: var(--background--surface);
}

.userBubble {
	align-self: flex-end;
	max-width: min(100%, 28rem);
	border-bottom-right-radius: 0;
}

.agentBubble {
	align-self: flex-start;
	max-width: 100%;
	border-color: transparent;
	border-bottom-left-radius: 0;
	background-color: var(--background--subtle);
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
	border-radius: var(--radius--lg);
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

.conversation {
	display: flex;
	flex: 1;
	flex-direction: column;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
	/* The answers of the two versions end on the same line, next to the usage. */
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.toolCalls {
	display: flex;
	flex-direction: column;
}

.checklist {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.checkRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.checkIcon {
	flex-shrink: 0;
	/* Aligns the icon with the first line of the label. */
	margin-top: var(--spacing--5xs);
}

.checkText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.checkLabel {
	overflow-wrap: anywhere;
}

.pass .checkIcon {
	color: var(--color--success);
}

.fail .checkIcon,
.fail .checkLabel {
	color: var(--color--danger);
}

.muted .checkIcon,
.muted .checkLabel {
	color: var(--text-color--subtle);
}

.warning .checkIcon {
	color: var(--color--warning);
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

.toggle {
	align-self: flex-start;
	margin-top: auto;
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
