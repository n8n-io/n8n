<script setup lang="ts">
import { isAgentProposalRegression, type AgentProposalEvidence } from '@n8n/api-types';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import AgentProposalArmStatus from './AgentProposalArmStatus.vue';
import AgentProposalEvalCaseDetail from './AgentProposalEvalCaseDetail.vue';
import { armStatus, orderCaseResults, summarizeCaseResults } from './agentProposalEvalCases';

const props = defineProps<{ evidence: AgentProposalEvidence }>();

const i18n = useI18n();

const summary = computed(() => summarizeCaseResults(props.evidence.cases));
/* A proposal without an agent edit has one version: the current agent. */
const isComparison = computed(() => summary.value.proposedPassed !== null);

const rows = computed(() =>
	orderCaseResults(props.evidence.cases).map((result) => ({
		result,
		newlyFailing: isAgentProposalRegression(result),
		cells: [
			{
				key: 'published',
				label: i18n.baseText(
					isComparison.value
						? 'inbox.agentProposal.evals.version.published'
						: 'inbox.agentProposal.evals.version.current',
				),
				status: armStatus(result.published),
			},
			...(result.proposed
				? [
						{
							key: 'proposed',
							label: i18n.baseText('inbox.agentProposal.evals.version.proposed'),
							status: armStatus(result.proposed),
						},
					]
				: []),
		],
	})),
);

const columnLabels = computed(() =>
	isComparison.value
		? [
				i18n.baseText('inbox.agentProposal.evals.version.published'),
				i18n.baseText('inbox.agentProposal.evals.version.proposed'),
			]
		: [i18n.baseText('inbox.agentProposal.evals.version.current')],
);

const passedText = (
	key:
		| 'inbox.agentProposal.evals.summary.published'
		| 'inbox.agentProposal.evals.summary.proposed'
		| 'inbox.agentProposal.evals.summary.current',
	passed: number,
) =>
	i18n.baseText(key, {
		interpolate: { passed: String(passed), total: String(summary.value.total) },
	});

const countText = (
	key:
		| 'inbox.agentProposal.evals.summary.cases'
		| 'inbox.agentProposal.evals.summary.newlyFailing'
		| 'inbox.agentProposal.evals.summary.fixed',
	count: number,
) => i18n.baseText(key, { adjustToNumber: count, interpolate: { count: String(count) } });

const selectedKey = ref<string | null>(null);

function toggle(caseKey: string) {
	selectedKey.value = selectedKey.value === caseKey ? null : caseKey;
}
</script>

<template>
	<N8nText
		v-if="rows.length === 0"
		tag="p"
		step="xs"
		color="text-light"
		data-test-id="agent-proposal-evals-empty"
	>
		{{ i18n.baseText('inbox.agentProposal.evals.empty') }}
	</N8nText>
	<div
		v-else
		:class="[$style.results, { [$style.preview]: !isComparison }]"
		data-test-id="agent-proposal-evals"
	>
		<ul :class="$style.summary" role="list" data-test-id="agent-proposal-evals-summary">
			<li>
				<N8nText step="xs" bold color="text-dark">
					{{ countText('inbox.agentProposal.evals.summary.cases', summary.total) }}
				</N8nText>
			</li>
			<template v-if="summary.proposedPassed !== null">
				<li>
					<N8nText step="xs" color="text-base">
						{{ passedText('inbox.agentProposal.evals.summary.published', summary.publishedPassed) }}
					</N8nText>
				</li>
				<li>
					<N8nText step="xs" color="text-base">
						{{ passedText('inbox.agentProposal.evals.summary.proposed', summary.proposedPassed) }}
					</N8nText>
				</li>
				<li v-if="summary.newlyFailing > 0">
					<N8nBadge variant="danger" data-test-id="agent-proposal-evals-summary-newly-failing">
						{{ countText('inbox.agentProposal.evals.summary.newlyFailing', summary.newlyFailing) }}
					</N8nBadge>
				</li>
				<li v-if="summary.fixed > 0">
					<N8nBadge variant="success" data-test-id="agent-proposal-evals-summary-fixed">
						{{ countText('inbox.agentProposal.evals.summary.fixed', summary.fixed) }}
					</N8nBadge>
				</li>
			</template>
			<li v-else>
				<N8nText step="xs" color="text-base">
					{{ passedText('inbox.agentProposal.evals.summary.current', summary.publishedPassed) }}
				</N8nText>
			</li>
		</ul>

		<div :class="$style.table">
			<!-- Each status cell has its own version label for assistive technology. -->
			<div :class="[$style.grid, $style.head]" aria-hidden="true">
				<N8nText step="2xs" bold color="text-base">
					{{ i18n.baseText('inbox.agentProposal.evals.column.case') }}
				</N8nText>
				<span :class="$style.cells">
					<N8nText v-for="label in columnLabels" :key="label" step="2xs" bold color="text-base">
						{{ label }}
					</N8nText>
				</span>
				<span :class="$style.chevron" />
			</div>
			<ul :class="$style.list" role="list">
				<li
					v-for="row in rows"
					:key="row.result.caseKey"
					:class="$style.item"
					data-test-id="agent-proposal-eval-case"
				>
					<button
						type="button"
						:class="[$style.grid, $style.row]"
						:aria-expanded="selectedKey === row.result.caseKey"
						data-test-id="agent-proposal-eval-case-toggle"
						@click="toggle(row.result.caseKey)"
					>
						<span :class="$style.case">
							<N8nText step="xs" color="text-dark" :title="row.result.input" :class="$style.input">
								{{ row.result.input }}
							</N8nText>
							<N8nBadge
								v-if="row.newlyFailing"
								variant="danger"
								:class="$style.badge"
								data-test-id="agent-proposal-eval-case-newly-failing"
							>
								{{ i18n.baseText('inbox.agentProposal.evals.badge.newlyFailing') }}
							</N8nBadge>
							<N8nBadge
								v-if="row.result.motivating"
								:class="$style.badge"
								data-test-id="agent-proposal-eval-case-motivating"
							>
								{{ i18n.baseText('inbox.agentProposal.evals.badge.motivating') }}
							</N8nBadge>
						</span>
						<span :class="$style.cells">
							<span
								v-for="cell in row.cells"
								:key="cell.key"
								:class="$style.cell"
								:data-test-id="`agent-proposal-eval-case-${cell.key}`"
							>
								<N8nText step="2xs" color="text-light" :class="$style.cellLabel">
									{{ cell.label }}
								</N8nText>
								<AgentProposalArmStatus :status="cell.status" />
							</span>
						</span>
						<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					</button>
					<AgentProposalEvalCaseDetail
						v-if="selectedKey === row.result.caseKey"
						:result="row.result"
					/>
				</li>
			</ul>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.results {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	/* The component owns its container, so it does not depend on the name of a parent container. */
	container-name: agent-proposal-evals;
	container-type: inline-size;
}

.summary {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs) var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.table {
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.item + .item {
	border-top: var(--border);
}

.grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto var(--spacing--sm);
	align-items: center;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm);
}

.head {
	min-height: var(--height--md);
	border-bottom: var(--border);
	background-color: var(--background--subtle);
}

.row {
	width: 100%;
	min-height: var(--height--xl);
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.case {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.input {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	flex-shrink: 0;
}

/* The two status columns have one fixed width, so the heading and all rows line up. */
.cells {
	display: grid;
	grid-template-columns: repeat(2, 7rem);
	gap: var(--spacing--xs);
}

.preview .cells {
	grid-template-columns: 7rem;
}

.cell {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

/* The column heading names the version at this width. The label stays for assistive technology. */
.cellLabel {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	[aria-expanded='false'] > & {
		transform: rotate(-90deg);
	}
}

@container agent-proposal-evals (max-width: 40rem) {
	.head {
		display: none;
	}

	.row {
		grid-template-columns: minmax(0, 1fr) var(--spacing--sm);
		row-gap: var(--spacing--3xs);
		padding-block: var(--spacing--2xs);
	}

	.case {
		flex-wrap: wrap;
	}

	.cells,
	.preview .cells {
		display: flex;
		flex-wrap: wrap;
		grid-column: 1 / -1;
		grid-row: 2;
		gap: var(--spacing--3xs) var(--spacing--sm);
	}

	.cellLabel {
		position: static;
		width: auto;
		height: auto;
		margin: 0;
		overflow: visible;
		clip: auto;
	}

	.chevron {
		grid-column: 2;
		grid-row: 1;
	}
}
</style>
