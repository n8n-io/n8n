<script setup lang="ts">
/**
 * The first checks of the agent that was just built, as one step line in the
 * Assistant's thread. It drafts three checks and offers to run them. Nothing
 * runs until the person says so. "Run 3 checks" saves them as the agent's
 * first dataset and runs it. A check that needs work can be fixed in one go:
 * the instructions are rewritten once for all failing checks, and those run
 * again. "Undo change" puts the earlier config back and runs the checks again.
 * Behind the `101_agent_evals` flag.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import {
	N8nAiActivityStepButton as StepButton,
	N8nButton,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { truncate } from '@n8n/utils/string/truncate';

import { TIME } from '@/app/constants';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import { useApplyAgentEvalSuggestions } from '@/features/agents/composables/useApplyAgentEvalSuggestions';
import { getAgentConfig, updateAgentConfig } from '@/features/agents/composables/useAgentApi';
import type { AgentJsonConfig } from '@/features/agents/types';
import {
	readAgentAnswer,
	readCaseRequest,
	readCaseWhatToCheck,
	readErrorMessage,
	readFirstSentence,
	readVerdictReasoning,
	toAvatarKind,
} from '@/features/agents/utils/agent-eval-review';
import { resolveCaseColumns } from '@/features/agents/utils/agentEvalCases.utils';
import AgentAvatar, { type AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';

const props = defineProps<{
	target: { agentId: string; projectId: string };
}>();

const emit = defineEmits<{
	/** The person ran the checks: the offer must stay while its dataset appears. */
	confirm: [];
	dismiss: [];
	'try-agent': [];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const store = useAgentEvalsStore();
const { applyingIds, applySuggestions } = useApplyAgentEvalSuggestions(() => props.target);

/** The number of checks the offer drafts. */
const CHECK_COUNT = 3;
/** A run of three settles in seconds, so it is read more often than the Checks tab does. */
const POLL_INTERVAL_MS = 3 * TIME.SECOND;
/** The longest reply a passing row quotes. */
const REPLY_PREVIEW_LENGTH = 120;

type Phase = 'preparing' | 'offer' | 'starting' | 'checked';

const phase = ref<Phase>('preparing');
const cases = ref<AgentEvalDraftCase[]>([]);
const datasetId = ref<string | null>(null);
const runId = ref<string | null>(null);
/** What the last change did, for the line above the new results. */
const changeNote = ref<'updated' | 'undone' | null>(null);
/** The config before "Fix", for "Undo change". */
const configBeforeFix = ref<AgentJsonConfig | null>(null);
const undoing = ref(false);

// Not reactive by design: it only guards async continuations against acting
// after the panel is gone.
let isMounted = true;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

type CheckLine = {
	id: string;
	status: AgentAvatarKind;
	rule: string;
	/** The second line: the sample message, "Running…", or the result. */
	detail: string;
	/** True when `detail` is the sample message, which shows in quotes. */
	quoted: boolean;
};

const review = computed(() => (runId.value ? store.getReview(runId.value) : null));
const results = computed(() => review.value?.results ?? []);
const applying = computed(() => applyingIds.value.length > 0);
const runInFlight = computed(() =>
	runId.value ? store.isRunInFlight(runId.value) || results.value.length === 0 : false,
);

function resultDetail(status: AgentAvatarKind, reply: string | null, reason: string | null) {
	if (status === 'waiting' || status === 'idle') {
		return i18n.baseText('instanceAi.firstCheck.rowRunning');
	}
	if (status === 'pass' || status === 'strong') return truncate(reply ?? '', REPLY_PREVIEW_LENGTH);
	return readFirstSentence(reason) ?? '';
}

const lines = computed<CheckLine[]>(() => {
	if (phase.value !== 'checked' || results.value.length === 0) {
		const running = phase.value === 'starting' || phase.value === 'checked';
		return cases.value.map((item, index) => ({
			id: `case-${index}`,
			status: running ? 'waiting' : 'idle',
			rule: item.whatToCheck,
			detail: running ? i18n.baseText('instanceAi.firstCheck.rowRunning') : item.input,
			quoted: !running,
		}));
	}
	return results.value.map((result) => {
		const status = toAvatarKind(result.status, result.verdict);
		return {
			id: result.id,
			status,
			rule: readCaseWhatToCheck(result.input) ?? readCaseRequest(result.input),
			detail: resultDetail(
				status,
				readAgentAnswer(result.output),
				readErrorMessage(result.errorDetails) ?? readVerdictReasoning(result.verdict),
			),
			quoted: false,
		};
	});
});

const total = computed(() => lines.value.length);
const done = computed(
	() => lines.value.filter((line) => line.status !== 'waiting' && line.status !== 'idle').length,
);
const failingIds = computed(() =>
	lines.value.filter((line) => line.status === 'work' || line.status === 'fail').map((l) => l.id),
);
const busy = computed(
	() =>
		phase.value === 'preparing' ||
		phase.value === 'starting' ||
		applying.value ||
		undoing.value ||
		(phase.value === 'checked' && runInFlight.value),
);
const settled = computed(() => phase.value === 'checked' && !busy.value);

const headerKind = computed<AgentAvatarKind>(() => {
	if (phase.value === 'offer') return 'idle';
	if (busy.value) return 'waiting';
	return failingIds.value.length > 0 ? 'work' : 'pass';
});

const headerText = computed(() => {
	if (phase.value === 'preparing') return i18n.baseText('instanceAi.firstCheck.preparing');
	if (phase.value === 'offer') return i18n.baseText('instanceAi.firstCheck.ready');
	if (applying.value) return i18n.baseText('instanceAi.firstCheck.applying');
	if (undoing.value) return i18n.baseText('instanceAi.firstCheck.undoing');
	if (busy.value) {
		return i18n.baseText('instanceAi.firstCheck.runningHeader', {
			adjustToNumber: total.value,
			interpolate: { done: String(done.value), total: String(total.value) },
		});
	}
	const failing = failingIds.value.length;
	if (failing === 0) {
		return i18n.baseText('instanceAi.firstCheck.allPass', {
			adjustToNumber: total.value,
			interpolate: { count: String(total.value) },
		});
	}
	return i18n.baseText('instanceAi.firstCheck.needWork', {
		adjustToNumber: failing,
		interpolate: { count: String(failing), total: String(total.value) },
	});
});

const fixLabel = computed(() => {
	const count = failingIds.value.length;
	if (count === 1) return i18n.baseText('instanceAi.firstCheck.fixIt');
	if (count === 2) return i18n.baseText('instanceAi.firstCheck.fixBoth');
	return i18n.baseText('instanceAi.firstCheck.fixCount', {
		interpolate: { count: String(count) },
	});
});

function stopPolling() {
	if (pollTimer) clearTimeout(pollTimer);
	pollTimer = null;
}

// Reads the run until it settles. Its own loop, not the store's: the Checks tab
// may be watching another run at the same time.
function pollRun(id: string) {
	stopPolling();
	pollTimer = setTimeout(async () => {
		pollTimer = null;
		if (!isMounted || runId.value !== id) return;
		try {
			await store.refreshResults(props.target.projectId, props.target.agentId, id);
		} catch {
			// The next read tries again.
		}
		if (isMounted && runId.value === id && store.isRunInFlight(id)) pollRun(id);
	}, POLL_INTERVAL_MS);
}

async function startDatasetRun(id: string) {
	const { projectId, agentId } = props.target;
	const run = await store.startRun(projectId, agentId, id);
	if (!isMounted) return;
	runId.value = run.id;
	phase.value = 'checked';
	await store.openRun(projectId, agentId, run.id);
	if (isMounted) pollRun(run.id);
}

async function prepareChecks() {
	try {
		const { projectId, agentId } = props.target;
		const result = await store.generateDraftCases(projectId, agentId, {
			count: CHECK_COUNT,
			save: false,
		});
		if (!isMounted) return;
		if (result.cases.length === 0) throw new Error('No checks were drafted');
		cases.value = result.cases.slice(0, CHECK_COUNT);
		phase.value = 'offer';
	} catch (error) {
		if (!isMounted) return;
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.generateError'));
		emit('dismiss');
	}
}

/**
 * Saves the drafted checks as the agent's first dataset and runs it, like "Add
 * checks" in the Checks tab. A failure before the run starts deletes the
 * dataset, so a retry does not leave an empty one behind.
 */
async function onRunChecks() {
	if (phase.value !== 'offer') return;
	emit('confirm');
	phase.value = 'starting';
	const { projectId, agentId } = props.target;
	let createdDatasetId: string | undefined;
	let runSubmitted = false;
	try {
		const created = await store.createDraftDataset(projectId, agentId);
		createdDatasetId = created.datasetId;
		const columns = resolveCaseColumns(created.columnMapping);
		if (!columns) throw new Error('The draft dataset has no writable case columns');
		const source = { datasetId: created.datasetId, dataTableId: created.dataTableId, columns };
		await Promise.all(
			cases.value.map(
				async (item) =>
					await store.createCase(projectId, source, {
						input: item.input,
						whatToCheck: item.whatToCheck,
					}),
			),
		);
		datasetId.value = created.datasetId;
		runSubmitted = true;
		await startDatasetRun(created.datasetId);
	} catch (error) {
		if (createdDatasetId && !runSubmitted) {
			await store.deleteDraftDataset(projectId, agentId, createdDatasetId).catch(() => null);
		}
		if (!isMounted) return;
		if (!runSubmitted) phase.value = 'offer';
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
	}
}

// One rewrite of the instructions for every failing check, then those checks run
// again in place. The config is read first, so "Undo change" can put it back.
async function onFix() {
	const ids = failingIds.value;
	if (ids.length === 0 || busy.value) return;
	const { projectId, agentId } = props.target;
	try {
		const before = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
		configBeforeFix.value = before.config;
	} catch {
		configBeforeFix.value = null;
	}
	if (!isMounted) return;
	changeNote.value = null;
	const applied = await applySuggestions(ids);
	if (!isMounted) return;
	if (applied) changeNote.value = 'updated';
}

async function onUndo() {
	const before = configBeforeFix.value;
	if (!before || !datasetId.value || busy.value) return;
	const { projectId, agentId } = props.target;
	undoing.value = true;
	try {
		const current = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
		await updateAgentConfig(
			rootStore.restApiContext,
			projectId,
			agentId,
			before,
			current.configHash,
		);
		agentsEventBus.emit('agentUpdated', { agentId, source: 'agent-evals' });
		if (!isMounted) return;
		configBeforeFix.value = null;
		changeNote.value = 'undone';
		await startDatasetRun(datasetId.value);
	} catch (error) {
		if (isMounted) toast.showError(error, i18n.baseText('agents.builder.agentEvals.fix.undoError'));
	} finally {
		if (isMounted) undoing.value = false;
	}
}

function onTryAgent() {
	emit('confirm');
	emit('try-agent');
}

onMounted(prepareChecks);
onBeforeUnmount(() => {
	isMounted = false;
	stopPolling();
});
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-test-agent-preview-panel">
		<StepButton
			:loading="busy"
			:interactive="false"
			size="medium"
			data-test-id="instance-ai-first-checks-step"
		>
			<template #prefix>
				<AgentAvatar :kind="headerKind" size="xs" :class="$style.stepAvatar" />
			</template>
			<span data-test-id="instance-ai-first-checks-title">{{ headerText }}</span>
		</StepButton>

		<div v-if="phase !== 'preparing'" :class="$style.rail">
			<div :class="$style.railInner">
				<N8nText
					v-if="phase === 'offer'"
					tag="p"
					size="medium"
					color="text-base"
					:class="$style.offer"
				>
					{{
						cases.length === CHECK_COUNT
							? i18n.baseText('instanceAi.firstCheck.offer')
							: i18n.baseText('instanceAi.firstCheck.offerCount', {
									adjustToNumber: cases.length,
									interpolate: { count: String(cases.length) },
								})
					}}
				</N8nText>
				<N8nText
					v-if="changeNote && settled"
					tag="p"
					size="small"
					color="text-light"
					:class="$style.changeNote"
					data-test-id="instance-ai-first-checks-change-note"
				>
					<N8nIcon icon="check" size="small" />
					{{
						i18n.baseText(
							changeNote === 'updated'
								? 'instanceAi.firstCheck.updated'
								: 'instanceAi.firstCheck.undone',
						)
					}}
				</N8nText>
				<ul :class="$style.lines">
					<li
						v-for="line in lines"
						:key="line.id"
						:class="$style.line"
						:data-status="line.status"
						data-test-id="instance-ai-first-checks-row"
					>
						<AgentAvatar :kind="line.status" size="xs" :class="$style.lineAvatar" />
						<div :class="$style.lineText">
							<N8nText size="medium" color="text-dark" :class="$style.rule">{{
								line.rule
							}}</N8nText>
							<N8nText size="small" color="text-light" :class="$style.detail">{{
								line.quoted ? `“${line.detail}”` : line.detail
							}}</N8nText>
						</div>
					</li>
				</ul>
			</div>
		</div>

		<div v-if="phase === 'offer'" :class="$style.actions">
			<N8nButton
				variant="solid"
				size="medium"
				data-test-id="instance-ai-first-checks-run"
				@click="onRunChecks"
			>
				{{
					i18n.baseText('instanceAi.firstCheck.runChecks', {
						adjustToNumber: cases.length,
						interpolate: { count: String(cases.length) },
					})
				}}
			</N8nButton>
			<N8nButton
				variant="outline"
				size="medium"
				data-test-id="instance-ai-first-checks-try"
				@click="onTryAgent"
			>
				{{ i18n.baseText('instanceAi.firstCheck.tryYourself') }}
			</N8nButton>
		</div>

		<div v-else-if="settled" :class="$style.actions">
			<N8nButton
				v-if="failingIds.length > 0"
				variant="solid"
				size="medium"
				data-test-id="instance-ai-first-checks-fix"
				@click="onFix"
			>
				{{ fixLabel }}
			</N8nButton>
			<N8nButton
				v-if="configBeforeFix && changeNote === 'updated'"
				variant="outline"
				size="medium"
				data-test-id="instance-ai-first-checks-undo"
				@click="onUndo"
			>
				{{ i18n.baseText('agents.builder.agentEvals.fix.undo') }}
			</N8nButton>
			<N8nButton
				:variant="failingIds.length > 0 ? 'outline' : 'solid'"
				size="medium"
				data-test-id="instance-ai-first-checks-try"
				@click="onTryAgent"
			>
				{{ i18n.baseText('instanceAi.firstCheck.tryYourself') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0;
}

/* 16px, so the bot sits in the step line like the builder's step icons. */
.root .stepAvatar {
	--avatar-size: 16px;
	margin-right: var(--spacing--4xs);
}

/* The builder's rail (AgentSection's .content). */
.rail {
	margin-left: var(--spacing--xs);
}

.railInner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0 var(--spacing--3xs) var(--spacing--2xs);
	border-left: var(--border);
}

.offer,
.changeNote {
	margin: 0;
}

.changeNote {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.lines {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.line {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

/* Lined up with the rule's first line. */
.root .lineAvatar {
	--avatar-size: 16px;
	margin-top: var(--spacing--5xs);
}

.lineText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.rule,
.detail {
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
