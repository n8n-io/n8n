<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nRadioButtons,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useMessage } from '@/app/composables/useMessage';
import { useScenarioRunnerStore } from '../scenarioRunner.store';
import { deriveDisplayStatus, useScenariosStore } from '../scenarios.store';
import type {
	ScenarioDisplayStatus,
	ScenarioExpectation,
	ScenarioRecord,
} from '../scenarios.store';
import ScenarioRunnerDialog from './ScenarioRunnerDialog.vue';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const store = useScenariosStore();
const runnerStore = useScenarioRunnerStore();
const message = useMessage();

const scenarios = computed(() => store.scenariosFor(props.workflowId));

const selectedId = ref<string | null>(null);
const editingName = ref(false);

// Draft for the inline "new scenario" form. Null when closed.
const draft = ref<{ name: string; description: string } | null>(null);

// Dialog state — opens when user clicks Run on a scenario
const dialogOpen = ref(false);
const runningScenarioId = ref<string | null>(null);

const selectedScenario = computed(() =>
	selectedId.value ? (scenarios.value.find((s) => s.id === selectedId.value) ?? null) : null,
);

watch(
	scenarios,
	(list) => {
		if (selectedId.value && !list.find((s) => s.id === selectedId.value)) {
			selectedId.value = list[0]?.id ?? null;
		} else if (!selectedId.value && list.length > 0) {
			selectedId.value = list[0].id;
		}
	},
	{ immediate: true },
);

function statusIcon(status: ScenarioDisplayStatus): IconName {
	switch (status) {
		case 'passed':
		case 'expectedFail':
			return 'circle-check';
		case 'passedWithIssues':
			return 'triangle-alert';
		case 'failed':
		case 'unexpectedFail':
		case 'unexpectedPass':
			return 'circle-x';
		case 'unrun':
		default:
			return 'circle';
	}
}

function statusColor(
	status: ScenarioDisplayStatus,
): 'success' | 'warning' | 'danger' | 'text-light' {
	switch (status) {
		case 'passed':
		case 'expectedFail':
			return 'success';
		case 'passedWithIssues':
			return 'warning';
		case 'failed':
		case 'unexpectedFail':
		case 'unexpectedPass':
			return 'danger';
		case 'unrun':
		default:
			return 'text-light';
	}
}

function statusLabel(status: ScenarioDisplayStatus): string {
	return i18n.baseText(`scenarios.displayStatus.${status}`);
}

const expectationOptions = computed<Array<{ label: string; value: ScenarioExpectation }>>(() => [
	{ label: i18n.baseText('scenarios.expectation.pass'), value: 'pass' },
	{ label: i18n.baseText('scenarios.expectation.fail'), value: 'fail' },
	{ label: i18n.baseText('scenarios.expectation.any'), value: 'any' },
]);

function commitExpectation(value: ScenarioExpectation) {
	if (!selectedScenario.value) return;
	if (value === selectedScenario.value.expectedOutcome) return;
	store.update(props.workflowId, selectedScenario.value.id, { expectedOutcome: value });
}

const selectedDisplayStatus = computed<ScenarioDisplayStatus>(() =>
	selectedScenario.value ? deriveDisplayStatus(selectedScenario.value) : 'unrun',
);

const mismatchMessageKey = computed(() => {
	switch (selectedDisplayStatus.value) {
		case 'unexpectedFail':
			return 'scenarios.mismatch.unexpectedFail' as const;
		case 'unexpectedPass':
			return 'scenarios.mismatch.unexpectedPass' as const;
		default:
			return null;
	}
});

function relativeTime(iso?: string): string {
	if (!iso) return '';
	const then = new Date(iso).getTime();
	const diffSec = Math.round((Date.now() - then) / 1000);
	if (diffSec < 60) return i18n.baseText('scenarios.time.justNow');
	if (diffSec < 3600)
		return i18n.baseText('scenarios.time.minutesAgo', {
			interpolate: { n: Math.floor(diffSec / 60) },
		});
	if (diffSec < 86400)
		return i18n.baseText('scenarios.time.hoursAgo', {
			interpolate: { n: Math.floor(diffSec / 3600) },
		});
	return i18n.baseText('scenarios.time.daysAgo', {
		interpolate: { n: Math.floor(diffSec / 86400) },
	});
}

function descriptionPreview(scenario: ScenarioRecord): string {
	return scenario.description || i18n.baseText('scenarios.list.descriptionEmpty');
}

function openNewDraft() {
	draft.value = { name: '', description: '' };
}

function cancelDraft() {
	draft.value = null;
}

function saveDraft() {
	if (!draft.value) return;
	const name = draft.value.name.trim();
	const description = draft.value.description.trim();
	if (!name && !description) {
		cancelDraft();
		return;
	}
	const created = store.create(props.workflowId, {
		name: name || i18n.baseText('scenarios.defaultName'),
		description,
	});
	selectedId.value = created.id;
	draft.value = null;
}

function commitName(value: string) {
	if (!selectedScenario.value) return;
	store.update(props.workflowId, selectedScenario.value.id, { name: value });
	editingName.value = false;
}

function commitDescription(value: string) {
	if (!selectedScenario.value) return;
	if (value === selectedScenario.value.description) return;
	store.update(props.workflowId, selectedScenario.value.id, { description: value });
}

async function deleteSelected() {
	if (!selectedScenario.value) return;
	const confirmed = await message.confirm(
		i18n.baseText('scenarios.delete.confirmBody', {
			interpolate: { name: selectedScenario.value.name },
		}),
		i18n.baseText('scenarios.delete.confirmTitle'),
		{
			confirmButtonText: i18n.baseText('scenarios.delete.confirmYes'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (confirmed === 'confirm') {
		store.remove(props.workflowId, selectedScenario.value.id);
	}
}

function runSelected() {
	if (!selectedScenario.value) return;
	runnerStore.reset();
	runningScenarioId.value = selectedScenario.value.id;
	// Seed the runner store's textarea with this scenario's description so the
	// dialog opens with the right text. See ScenarioRunnerDialog's open watcher.
	runnerStore.setScenarioText(selectedScenario.value.description);
	dialogOpen.value = true;
}

// When a run completes inside the dialog, persist the result on the scenario record.
watch(
	() => runnerStore.status,
	(status, prev) => {
		if (!runningScenarioId.value) return;
		if (prev === 'running' && (status === 'succeeded' || status === 'failed')) {
			const result = runnerStore.result;
			if (result) {
				store.persistRunResult(
					props.workflowId,
					runningScenarioId.value,
					result,
					runnerStore.durationMs ?? undefined,
				);
			}
		}
	},
);

watch(dialogOpen, (open) => {
	if (!open) {
		runningScenarioId.value = null;
	}
});
</script>

<template>
	<div :class="$style.wrapper">
		<header :class="$style.header">
			<div>
				<N8nText tag="h2" bold size="large" color="text-dark">
					{{ i18n.baseText('scenarios.title') }}
				</N8nText>
				<N8nText tag="p" size="small" color="text-light" :class="$style.subtitle">
					{{ i18n.baseText('scenarios.subtitle') }}
				</N8nText>
			</div>
			<N8nButton
				type="primary"
				size="small"
				icon="plus"
				:label="i18n.baseText('scenarios.newButton')"
				data-test-id="scenarios-new"
				@click="openNewDraft"
			/>
		</header>

		<div v-if="scenarios.length === 0 && !draft" :class="$style.empty">
			<N8nIcon icon="sparkles" size="xlarge" color="text-light" />
			<N8nText size="medium" color="text-dark" bold>
				{{ i18n.baseText('scenarios.empty.title') }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.emptyBody">
				{{ i18n.baseText('scenarios.empty.body') }}
			</N8nText>
			<N8nButton
				type="primary"
				size="small"
				icon="plus"
				:label="i18n.baseText('scenarios.newButton')"
				@click="openNewDraft"
			/>
		</div>

		<div v-else :class="$style.body">
			<aside :class="$style.list">
				<div v-if="draft" :class="$style.draftCard" data-test-id="scenarios-draft">
					<N8nInput
						v-model="draft.name"
						:placeholder="i18n.baseText('scenarios.new.namePlaceholder')"
						size="small"
						:class="$style.draftName"
						@keydown.enter.prevent="saveDraft"
						@keydown.escape.prevent="cancelDraft"
					/>
					<N8nInput
						v-model="draft.description"
						type="textarea"
						:rows="3"
						:placeholder="i18n.baseText('scenarios.new.descriptionPlaceholder')"
						@keydown.escape.prevent="cancelDraft"
					/>
					<div :class="$style.draftActions">
						<N8nButton
							type="tertiary"
							size="mini"
							:label="i18n.baseText('generic.cancel')"
							@click="cancelDraft"
						/>
						<N8nButton
							type="primary"
							size="mini"
							:label="i18n.baseText('scenarios.new.save')"
							@click="saveDraft"
						/>
					</div>
				</div>

				<button
					v-for="scenario in scenarios"
					:key="scenario.id"
					type="button"
					:class="[$style.listRow, selectedId === scenario.id && $style.listRowActive]"
					:data-test-id="`scenario-row-${scenario.id}`"
					@click="selectedId = scenario.id"
				>
					<N8nTooltip placement="top" :content="statusLabel(deriveDisplayStatus(scenario))">
						<N8nIcon
							:icon="statusIcon(deriveDisplayStatus(scenario))"
							:color="statusColor(deriveDisplayStatus(scenario))"
							size="small"
							:class="$style.listDot"
						/>
					</N8nTooltip>
					<div :class="$style.listText">
						<N8nText bold size="small" color="text-dark" :class="$style.listName">
							{{ scenario.name }}
						</N8nText>
						<N8nText size="xsmall" color="text-light" :class="$style.listPreview">
							{{ descriptionPreview(scenario) }}
						</N8nText>
					</div>
				</button>
			</aside>

			<section v-if="selectedScenario" :class="$style.detail">
				<div :class="$style.detailHeader">
					<N8nInput
						v-if="editingName"
						:model-value="selectedScenario.name"
						size="small"
						:class="$style.nameInput"
						autofocus
						@blur="(e) => commitName((e.target as HTMLInputElement).value)"
						@keydown.enter.prevent="(e) => commitName((e.target as HTMLInputElement).value)"
						@keydown.escape.prevent="editingName = false"
					/>
					<button
						v-else
						type="button"
						:class="$style.nameButton"
						data-test-id="scenarios-name"
						@click="editingName = true"
					>
						<N8nText tag="span" size="medium" bold color="text-dark">
							{{ selectedScenario.name }}
						</N8nText>
						<N8nIcon icon="pencil" size="xsmall" color="text-xlight" />
					</button>

					<N8nIconButton
						type="tertiary"
						size="small"
						icon="trash-2"
						:title="i18n.baseText('scenarios.delete.action')"
						data-test-id="scenarios-delete"
						@click="deleteSelected"
					/>
				</div>

				<label :class="$style.field">
					<N8nText bold size="xsmall" color="text-dark">
						{{ i18n.baseText('scenarios.detail.descriptionLabel') }}
					</N8nText>
					<N8nInput
						:model-value="selectedScenario.description"
						type="textarea"
						:rows="5"
						:placeholder="i18n.baseText('scenarioRunner.input.placeholder')"
						data-test-id="scenarios-description"
						@change="(value: string) => commitDescription(value)"
					/>
				</label>

				<div :class="$style.field">
					<N8nText bold size="xsmall" color="text-dark">
						{{ i18n.baseText('scenarios.detail.expectationLabel') }}
					</N8nText>
					<N8nRadioButtons
						:model-value="selectedScenario.expectedOutcome"
						:options="expectationOptions"
						size="small"
						data-test-id="scenarios-expectation"
						@update:model-value="(v: unknown) => commitExpectation(v as ScenarioExpectation)"
					/>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('scenarios.detail.expectationHelper') }}
					</N8nText>
				</div>

				<N8nCallout
					v-if="mismatchMessageKey"
					theme="danger"
					icon="triangle-alert"
					:class="$style.mismatch"
				>
					{{ i18n.baseText(mismatchMessageKey) }}
				</N8nCallout>

				<div :class="$style.runRow">
					<N8nButton
						type="primary"
						size="small"
						icon="play"
						:label="i18n.baseText('scenarios.detail.run')"
						data-test-id="scenarios-run"
						@click="runSelected"
					/>
					<div :class="$style.lastRun" v-if="selectedScenario.lastRunStatus">
						<N8nIcon
							:icon="statusIcon(selectedDisplayStatus)"
							:color="statusColor(selectedDisplayStatus)"
							size="small"
						/>
						<N8nText size="small" :color="statusColor(selectedDisplayStatus)" bold>
							{{ statusLabel(selectedDisplayStatus) }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{ relativeTime(selectedScenario.lastRunAt) }}
							<span v-if="selectedScenario.lastRunDurationMs !== undefined">
								·
								{{
									i18n.baseText('scenarioRunner.verdict.duration', {
										interpolate: {
											s: (selectedScenario.lastRunDurationMs / 1000).toFixed(1),
										},
									})
								}}
							</span>
						</N8nText>
					</div>
					<N8nText v-else size="xsmall" color="text-light">
						{{ i18n.baseText('scenarios.detail.notRunYet') }}
					</N8nText>
				</div>
			</section>
		</div>

		<ScenarioRunnerDialog v-model="dialogOpen" :workflow-id="workflowId" />
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 1100px;
	margin: 0 auto;
	padding: var(--spacing--md) var(--spacing--lg);
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.subtitle {
	margin-top: var(--spacing--3xs);
	max-width: 620px;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--3xl) var(--spacing--lg);
	text-align: center;
	flex: 1;
}

.emptyBody {
	max-width: 420px;
}

.body {
	display: grid;
	grid-template-columns: minmax(240px, 320px) 1fr;
	gap: var(--spacing--md);
	flex: 1;
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	overflow-y: auto;
	padding-right: var(--spacing--2xs);
}

.draftCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
}

.draftName {
	font-weight: var(--font-weight--bold);
}

.draftActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.listRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: none;
	border: var(--border-width) var(--border-style) transparent;
	border-radius: var(--radius);
	cursor: pointer;
	text-align: left;
	width: 100%;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.listRowActive {
	background-color: var(--color--background--light-2);
	border-color: var(--color--foreground);
}

.listDot {
	margin-top: 2px;
	flex-shrink: 0;
}

.listText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.listName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.listPreview {
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-clamp: 2;
}

.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-y: auto;
	padding-left: var(--spacing--md);
	border-left: var(--border);
}

.detailHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.nameButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	flex: 1;
	text-align: left;
	min-width: 0;

	&:hover svg {
		color: var(--color--text--tint-1);
	}
}

.nameInput {
	flex: 1;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.mismatch {
	margin: 0;
}

.runRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.lastRun {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}
</style>
