<script setup lang="ts">
/**
 * The "Add a check" panel of the checks view. Two ways in: type a rule (a
 * test message is drafted for it), or pick several of a batch of prepared
 * cases and add them together. Either way the cases are written to the
 * dataset and the parent is told. Nothing runs until the person runs it.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nCheckbox, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalCaseSource } from '../utils/agentEvalCases.utils';

const props = defineProps<{
	projectId: string;
	agentId: string;
	/** Where the new case is written. Null when the dataset has no writable case columns. */
	caseSource: AgentEvalCaseSource | null;
	/** No `agent:update` — nothing can be added. */
	disabled?: boolean;
	/** The checks are starting or running, so another add would start a second run. */
	busy?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	/** Cases were written to the dataset. */
	added: [];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();

const PREPARED_COUNT = 10;
const COLLAPSED_ROW_COUNT = 3;

type PreparedCase = AgentEvalDraftCase & { key: number };

const ruleInput = ref('');
const prepared = ref<PreparedCase[]>([]);
const loadingPrepared = ref(false);
const expanded = ref(false);
// 'rule' for the typed rule, 'picked' for the prepared cases being added.
const adding = ref<'rule' | 'picked' | null>(null);
const picked = ref<Set<number>>(new Set());

function setPicked(key: number, value: boolean) {
	const next = new Set(picked.value);
	if (value) next.add(key);
	else next.delete(key);
	picked.value = next;
}

const canAdd = computed(
	() => !props.disabled && props.caseSource !== null && !props.busy && adding.value === null,
);

const hasOverflow = computed(() => prepared.value.length > COLLAPSED_ROW_COUNT);
const shownPrepared = computed(() =>
	expanded.value || !hasOverflow.value
		? prepared.value
		: prepared.value.slice(0, COLLAPSED_ROW_COUNT),
);
const hiddenCount = computed(() => Math.max(0, prepared.value.length - COLLAPSED_ROW_COUNT));

// Guards the batch request against landing after the panel is gone.
let isMounted = true;

async function loadPrepared() {
	loadingPrepared.value = true;
	try {
		const result = await store.generateDraftCases(props.projectId, props.agentId, {
			count: PREPARED_COUNT,
			save: false,
		});
		if (!isMounted) return;
		prepared.value = result.cases.map((draft, key) => ({ ...draft, key }));
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
	} finally {
		if (isMounted) loadingPrepared.value = false;
	}
}

onMounted(loadPrepared);
onBeforeUnmount(() => {
	isMounted = false;
});

/** Writes the case to the dataset, then tells the parent to run the checks again. */
async function writeCase(value: { input: string; whatToCheck: string }): Promise<boolean> {
	const source = props.caseSource;
	if (!source) return false;
	try {
		const created = await store.createCase(props.projectId, source, value);
		// A null row means the Data Table write failed without throwing.
		if (!created) throw new Error('The test case was not saved');
	} catch (error) {
		if (isMounted) toast.showError(error, i18n.baseText('agents.builder.agentEvals.case.addError'));
		return false;
	}
	return true;
}

async function onAddRule() {
	const rule = ruleInput.value.trim();
	if (!rule || !canAdd.value) return;

	adding.value = 'rule';
	try {
		let input: string;
		try {
			const result = await store.generateDraftCases(props.projectId, props.agentId, {
				count: 1,
				save: false,
				rule,
			});
			const draft = result.cases[0];
			if (!draft) throw new Error('No test message was generated');
			input = draft.input;
		} catch (error) {
			if (isMounted)
				toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
			return;
		}
		if (!isMounted) return;

		if (await writeCase({ input, whatToCheck: rule })) {
			ruleInput.value = '';
			emit('added');
		}
	} finally {
		if (isMounted) adding.value = null;
	}
}

/** Writes every picked case in order, then tells the parent once. */
async function onAddPicked() {
	if (!canAdd.value || picked.value.size === 0) return;

	adding.value = 'picked';
	const written = new Set<number>();
	try {
		for (const row of prepared.value.filter((candidate) => picked.value.has(candidate.key))) {
			if (!(await writeCase({ input: row.input, whatToCheck: row.whatToCheck }))) break;
			written.add(row.key);
		}
	} finally {
		if (isMounted) {
			prepared.value = prepared.value.filter((candidate) => !written.has(candidate.key));
			picked.value = new Set([...picked.value].filter((key) => !written.has(key)));
			adding.value = null;
		}
		if (written.size > 0) emit('added');
	}
}

function toggleExpanded() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<section :class="$style.panel" data-testid="agent-eval-add-check">
		<header :class="$style.header">
			<N8nText tag="h3" bold size="medium" color="text-dark">
				{{ i18n.baseText('agents.builder.agentEvals.checks.addCheck') }}
			</N8nText>
			<N8nButton
				variant="ghost"
				size="small"
				icon-only
				:aria-label="i18n.baseText('agents.builder.agentEvals.checks.addCheckClose')"
				data-testid="agent-eval-add-check-close"
				@click="emit('close')"
			>
				<template #icon>
					<N8nIcon icon="x" size="small" />
				</template>
			</N8nButton>
		</header>

		<div :class="$style.ruleRow">
			<input
				v-model="ruleInput"
				:class="$style.ruleInput"
				:placeholder="i18n.baseText('agents.builder.agentEvals.checks.addCheckRulePlaceholder')"
				:aria-label="i18n.baseText('agents.builder.agentEvals.checks.addCheckRuleLabel')"
				:disabled="disabled || !caseSource"
				data-testid="agent-eval-add-check-rule-input"
				@keydown.enter.exact="onAddRule"
			/>
			<N8nButton
				variant="outline"
				size="small"
				:disabled="!canAdd || !ruleInput.trim()"
				:loading="adding === 'rule'"
				data-testid="agent-eval-add-check-rule-submit"
				@click="onAddRule"
			>
				{{ i18n.baseText('agents.builder.agentEvals.checks.addCheckSubmit') }}
			</N8nButton>
		</div>

		<div v-if="loadingPrepared" :class="$style.loading" data-testid="agent-eval-add-check-loading">
			<N8nSpinner size="small" />
			<N8nText color="text-base">
				{{ i18n.baseText('agents.builder.agentEvals.checks.addCheckPreparing') }}
			</N8nText>
		</div>

		<div
			v-else-if="prepared.length > 0"
			:class="$style.prepared"
			data-testid="agent-eval-add-check-prepared"
		>
			<N8nText bold color="text-dark" size="small">
				{{ i18n.baseText('agents.builder.agentEvals.checks.addCheckPrepared') }}
			</N8nText>
			<div :class="$style.list">
				<ul :class="$style.rows">
					<li
						v-for="row in shownPrepared"
						:key="row.key"
						:class="$style.row"
						data-testid="agent-eval-add-check-prepared-row"
					>
						<N8nCheckbox
							:model-value="picked.has(row.key)"
							:disabled="!canAdd"
							:class="$style.pick"
							@update:model-value="(value: boolean) => setPicked(row.key, value)"
						>
							<template #label>
								<span :class="$style.rowText">
									<N8nText color="text-dark" size="medium">{{
										row.whatToCheck || row.input
									}}</N8nText>
									<N8nText
										v-if="row.whatToCheck"
										color="text-light"
										size="small"
										:class="$style.message"
										>“{{ row.input }}”</N8nText
									>
								</span>
							</template>
						</N8nCheckbox>
					</li>
				</ul>
				<footer :class="$style.footer">
					<button
						v-if="hasOverflow"
						type="button"
						:class="$style.moreToggle"
						data-testid="agent-eval-add-check-more"
						@click="toggleExpanded"
					>
						<N8nText color="text-light" size="small">
							{{
								expanded
									? i18n.baseText('agents.builder.agentEvals.checks.addCheckFewer')
									: i18n.baseText('agents.builder.agentEvals.checks.addCheckMore', {
											interpolate: { count: String(hiddenCount) },
										})
							}}
						</N8nText>
					</button>
					<N8nButton
						variant="solid"
						size="small"
						:class="$style.addPicked"
						:disabled="!canAdd || picked.size === 0"
						:loading="adding === 'picked'"
						data-testid="agent-eval-add-check-prepared-add"
						@click="onAddPicked"
					>
						{{
							i18n.baseText('agents.builder.agentEvals.checks.addChecks', {
								adjustToNumber: picked.size,
								interpolate: { count: String(picked.size) },
							})
						}}
					</N8nButton>
				</footer>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--xl);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.ruleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.ruleInput {
	flex: 1;
	min-width: 0;
	padding: 0;
	border: none;
	background: transparent;
	font-size: var(--font-size--sm);
	color: var(--text-color--dark);

	// A native `<input>` draws the browser's own focus ring by default — reset
	// it here rather than globally, so other inputs keep theirs.
	&:focus,
	&:focus-visible {
		border: none;
		outline: none;
		box-shadow: none;
	}
}

.loading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.prepared {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: var(--spacing--xs) var(--spacing--xs) 0;
	list-style: none;
}

.row {
	display: flex;
}

/* The checkbox sits on the rule's first line. */
.pick {
	align-items: flex-start;
	width: 100%;
}

.rowText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

/* A long message stops at two lines. */
.message {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
}

.addPicked {
	margin-left: auto;
}

.moreToggle {
	padding: var(--spacing--4xs) 0;
	background: none;
	border: none;
	cursor: pointer;
}
</style>
