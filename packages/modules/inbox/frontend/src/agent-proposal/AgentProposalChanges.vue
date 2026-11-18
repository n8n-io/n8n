<script setup lang="ts">
import type { AgentProposalEdit, AgentProposalEvalCase } from '@n8n/api-types';
import { N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref } from 'vue';

import {
	evalCaseFields,
	fieldChange,
	splitExpectedTools,
	type AgentProposalFieldChange,
} from './agentProposalChangeFields';

const props = defineProps<{
	edits: AgentProposalEdit[];
	evalCases: AgentProposalEvalCase[];
}>();

const i18n = useI18n();

type Row = {
	id: string;
	icon: IconName;
	title: string;
	meta?: string;
	/** An added eval case has no earlier value, so it shows one column. */
	added: boolean;
	fields: AgentProposalFieldChange[];
};

function formatTools(expectedTools: string[]) {
	const { required, forbidden } = splitExpectedTools(expectedTools);
	const lines = [];
	if (required.length > 0) {
		lines.push(
			i18n.baseText('inbox.agentProposal.changes.expectedTools.required', {
				interpolate: { tools: required.join(', ') },
			}),
		);
	}
	if (forbidden.length > 0) {
		lines.push(
			i18n.baseText('inbox.agentProposal.changes.expectedTools.forbidden', {
				interpolate: { tools: forbidden.join(', ') },
			}),
		);
	}
	return lines.join('\n');
}

function editRow(edit: AgentProposalEdit, index: number): Row {
	const base = {
		id: `edit-${index}`,
		added: false,
		fields: [fieldChange('value', edit.before, edit.after)],
	};
	if (edit.kind === 'instructions') {
		return {
			...base,
			icon: 'file-text',
			title: i18n.baseText('inbox.agentProposal.changes.instructions'),
		};
	}
	if (edit.kind === 'toolDescription') {
		return {
			...base,
			icon: 'wrench',
			title: edit.toolName,
			meta: i18n.baseText('inbox.agentProposal.changes.toolDescription'),
		};
	}
	return {
		...base,
		icon: 'book-open',
		title: edit.skillName,
		meta: i18n.baseText(
			edit.field === 'description'
				? 'inbox.agentProposal.changes.skillDescription'
				: 'inbox.agentProposal.changes.skillInstructions',
		),
	};
}

function evalCaseRow(evalCase: AgentProposalEvalCase): Row {
	const added = evalCase.change === 'added';
	return {
		id: `case-${evalCase.caseKey}`,
		icon: 'list-checks',
		title: evalCase.input,
		meta: i18n.baseText(
			added
				? 'inbox.agentProposal.changes.evalCaseAdded'
				: 'inbox.agentProposal.changes.evalCaseUpdated',
		),
		added,
		fields: evalCaseFields(evalCase, formatTools),
	};
}

const rows = computed<Row[]>(() => [
	...props.edits.map(editRow),
	...props.evalCases.map(evalCaseRow),
]);

const sides = computed(() => [
	{ side: 'before' as const, label: i18n.baseText('inbox.agentProposal.changes.before') },
	{ side: 'after' as const, label: i18n.baseText('inbox.agentProposal.changes.after') },
]);

const fieldLabel = (field: AgentProposalFieldChange['field']) =>
	field === 'value' ? undefined : i18n.baseText(`inbox.agentProposal.changes.field.${field}`);

const openIds = ref(new Set<string>());

function setOpen(id: string, open: boolean) {
	if (open) openIds.value.add(id);
	else openIds.value.delete(id);
}
</script>

<template>
	<N8nText
		v-if="rows.length === 0"
		tag="p"
		step="xs"
		color="text-light"
		data-test-id="agent-proposal-changes-empty"
	>
		{{ i18n.baseText('inbox.agentProposal.changes.empty') }}
	</N8nText>
	<div v-else :class="$style.cards" data-test-id="agent-proposal-changes">
		<CollapsibleRoot
			v-for="row in rows"
			:key="row.id"
			:open="openIds.has(row.id)"
			as-child
			@update:open="setOpen(row.id, $event)"
		>
			<article :class="$style.card" data-test-id="agent-proposal-change">
				<header :class="$style.header">
					<N8nText tag="h3" size="medium" :class="$style.headingLevel">
						<CollapsibleTrigger :class="$style.trigger" data-test-id="agent-proposal-change-toggle">
							<N8nIcon :icon="row.icon" size="small" :class="$style.icon" />
							<span :class="$style.cardHeading">
								<N8nText
									bold
									size="medium"
									color="text-dark"
									:title="row.title"
									:class="$style.label"
								>
									{{ row.title }}
								</N8nText>
								<N8nText v-if="row.meta" step="xs" color="text-light" :class="$style.meta">
									{{ row.meta }}
								</N8nText>
							</span>
							<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
						</CollapsibleTrigger>
					</N8nText>
				</header>
				<CollapsibleContent :class="$style.body">
					<div
						v-for="change in row.fields"
						:key="change.field"
						:class="$style.field"
						:data-test-id="`agent-proposal-change-field-${change.field}`"
					>
						<N8nText
							v-if="fieldLabel(change.field)"
							step="2xs"
							bold
							color="text-base"
							:class="$style.fieldLabel"
						>
							{{ fieldLabel(change.field) }}
						</N8nText>
						<div :class="[$style.columns, { [$style.single]: row.added }]">
							<template v-for="column in sides" :key="column.side">
								<div
									v-if="!row.added || column.side === 'after'"
									:class="$style.column"
									:data-test-id="`agent-proposal-change-${column.side}`"
								>
									<N8nText v-if="!row.added" step="2xs" color="text-light">
										{{ column.label }}
									</N8nText>
									<N8nText
										v-if="change[column.side] === null"
										step="xs"
										color="text-light"
										data-test-id="agent-proposal-change-none"
									>
										{{ i18n.baseText('inbox.agentProposal.changes.none') }}
									</N8nText>
									<N8nText
										v-else
										tag="p"
										step="xs"
										color="text-dark"
										:class="[$style.value, $style[column.side]]"
									>
										<span
											v-for="(segment, index) in change[column.side]"
											:key="index"
											:class="{ [$style.changedWord]: segment.changed }"
											>{{ segment.text }}</span
										>
									</N8nText>
								</div>
							</template>
						</div>
					</div>
				</CollapsibleContent>
			</article>
		</CollapsibleRoot>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

/* The cards copy SelfHealingResultChanges, so the reviews of the inbox look the same. */
.cards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	/* The component owns its container, so it does not depend on the name of a parent container. */
	container-name: agent-proposal-changes;
	container-type: inline-size;
}

.card {
	display: flex;
	flex-shrink: 0;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	min-height: var(--height--xl);
	padding: 0 var(--spacing--sm);

	[data-state='open'] > & {
		border-bottom: var(--border);
	}
}

.headingLevel {
	display: flex;
	flex: 1;
	min-width: 0;
	align-self: stretch;
	margin: 0;
}

.trigger {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: 0;
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.cardHeading {
	display: flex;
	flex: 1;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	flex-shrink: 0;
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	[data-state='closed'] > & {
		transform: rotate(-90deg);
	}
}

.body {
	display: flex;
	flex-direction: column;
}

.field + .field {
	border-top: var(--border);
}

.fieldLabel {
	display: block;
	padding: var(--spacing--xs) var(--spacing--sm) 0;
}

.columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.single {
	grid-template-columns: minmax(0, 1fr);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-left: var(--border);
	}
}

.value {
	margin: 0;
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.changedWord {
	border-radius: var(--radius--3xs);
}

.before .changedWord {
	background-color: var(--diff--color--deleted--light);
}

.after .changedWord {
	background-color: var(--diff--color--new--light);
}

@container agent-proposal-changes (max-width: 36rem) {
	.columns {
		grid-template-columns: minmax(0, 1fr);
	}

	.column + .column {
		border-top: var(--border);
		border-left: none;
	}

	.cardHeading {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
	}
}
</style>
