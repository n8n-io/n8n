<script setup lang="ts">
/**
 * One eval case as a single row: a status avatar, the request text, and —
 * once it has run, or it needs correction — a chevron. In the complete view
 * the chevron expands the full input/output sample in place. In the small view
 * it is a right chevron that emits `open` instead, so the parent can open the
 * complete view on this case. A case with no output and nothing to correct has
 * nothing to open, so the chevron is hidden; an idle (never-run) case says so
 * in its place. A "needs work" or "couldn't finish" case still opens with no
 * output, to reach the correction form.
 */
import { computed, nextTick, ref, watch } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTimeAgo,
	type TextColor,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { usePracticeRunBannerDismissal } from '../composables/usePracticeRunBannerDismissal';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';
import EvalInitialSample from './EvalInitialSample.vue';

const props = defineProps<{
	status: AgentAvatarKind;
	input: string;
	output: string | null;
	/** Leading text before the input, e.g. "Your try" — omit for plain example rows. */
	label?: string;
	/** Base id for this row; its toggle and expanded sample suffix it with `-toggle` / `-placeholder`. */
	testId?: string;
	date?: string | null;
	/** True from "Save check" until the regenerate-and-rerun request resolves. */
	savingCheck?: boolean;
	/** True from "Run check" until the rerun request resolves. */
	runningCheck?: boolean;
	view?: 'small' | 'complete';
	/** Why this case errored (from `errorDetails`), or the judge's reasoning on
	 *  a graded fail (from `verdict.reasoning`) — the two never coexist on the
	 *  same row, since an errored case is never judged. */
	errorMessage?: string | null;
	/** Shown between the input and the answer in the expanded sample. */
	toolCalls?: ToolCall[];
	projectId?: string;
	/** The case's "what to check" criteria. */
	whatToCheck?: string | null;
	/** No `agent:update` — disables the correction controls (not expanding/viewing). */
	disabled?: boolean;
	/** True where there's no backend primitive to persist a correction yet (the
	 *  checks panel, for an already-committed run) — hides the note/Save-check
	 *  flow but keeps "Actually fine" available, since that's a local override
	 *  with nothing to persist. */
	hideRevise?: boolean;
	/** The complete view was opened on this case: expand it and scroll it into view. */
	focused?: boolean;
}>();

const emit = defineEmits<{
	/** The user's note on what the response should have done instead. */
	'save-check': [suggestion: string];
	'actually-fine': [];
	/** "Run check" on a case that doesn't need correction: rerun it as-is. */
	'rerun-check': [];
	/** The rule's edited text, from the pencil icon's inline editor. */
	'save-what-to-check': [text: string];
	/** The trash icon's confirmed delete — this case and its example. */
	'delete-check': [];
	/** Small view only: the chevron or row was clicked. */
	open: [];
}>();

const i18n = useI18n();
const { dismissed: practiceBannerDismissed, dismiss: dismissPracticeBanner } =
	usePracticeRunBannerDismissal();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const expanded = ref(false);
const suggestion = ref('');
const root = ref<HTMLElement | null>(null);

// A case the judge marked as needing work or unable to finish gets a chance to
// say what should have happened instead — a passed or not-yet-run case has
// nothing to correct.
const needsCorrection = computed(() => props.status === 'work' || props.status === 'fail');
// A "couldn't finish" case often has no output at all — it must still expand
// to reach the correction form, so this isn't gated on output alone.
const canExpand = computed(() => props.output !== null || needsCorrection.value);

type StatusText = { labelKey: BaseTextKey; color: TextColor };

// Only `view="complete"` reads this — the plain row's header already says its
// own thing in place of a status line (the scenario `label`, or the identical
// "not run" text via `showNotRun`).
const STATUS_TEXT: Record<AgentAvatarKind, StatusText> = {
	pass: { labelKey: 'agents.builder.agentEvals.checks.status.passes', color: 'success' },
	strong: { labelKey: 'agents.builder.agentEvals.checks.status.passes', color: 'success' },
	waiting: { labelKey: 'agents.builder.agentEvals.checks.status.running', color: 'text-light' },
	idle: { labelKey: 'agents.builder.agentEvals.checks.status.neverRan', color: 'text-light' },
	work: { labelKey: 'agents.builder.agentEvals.checks.status.needsWork', color: 'warning' },
	fail: { labelKey: 'agents.builder.agentEvals.checks.status.needsWork', color: 'danger' },
};

const statusText = computed(() => i18n.baseText(STATUS_TEXT[props.status].labelKey));
const statusColor = computed(() => STATUS_TEXT[props.status].color);

function toggleExpanded() {
	if (!canExpand.value) return;
	expanded.value = !expanded.value;
}

function onOpen() {
	if (!canExpand.value) return;
	emit('open');
}

watch(
	() => [props.focused, canExpand.value],
	async ([focused, expandable]) => {
		if (!focused || !expandable) return;
		expanded.value = true;
		await nextTick();
		root.value?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
	},
	{ immediate: true },
);

function onSaveCheck() {
	const value = suggestion.value.trim();
	if (!value) return;
	emit('save-check', value);
}

function onActuallyFine() {
	emit('actually-fine');
}

function onRunCheck() {
	emit('rerun-check');
}

const editingWhatToCheck = ref(false);
const whatToCheckDraft = ref('');

function onStartEditWhatToCheck() {
	whatToCheckDraft.value = props.whatToCheck ?? '';
	editingWhatToCheck.value = true;
}

function onSaveWhatToCheck() {
	const value = whatToCheckDraft.value.trim();
	if (!value) return;
	emit('save-what-to-check', value);
	editingWhatToCheck.value = false;
}

function onCancelEditWhatToCheck() {
	editingWhatToCheck.value = false;
}

async function onDeleteCheck() {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('instanceAi.testAgentPreview.deleteCheck.confirm.title', {
			interpolate: { title: props.input },
		}),
		description: i18n.baseText('instanceAi.testAgentPreview.deleteCheck.confirm.description'),
		confirmButtonText: i18n.baseText(
			'instanceAi.testAgentPreview.deleteCheck.confirm.confirmButton',
		),
		cancelButtonText: i18n.baseText('instanceAi.testAgentPreview.deleteCheck.confirm.cancelButton'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	emit('delete-check');
}

// Once the parent accepts or regenerates this case, its status moves away
// from needing correction — clear the note so a later failure starts blank
// rather than reshowing stale text.
watch(
	() => props.status,
	(status) => {
		if (status !== 'work' && status !== 'fail') suggestion.value = '';
	},
);
</script>

<template>
	<div ref="root" :class="$style.root" :data-test-id="testId">
		<div v-if="view === 'complete'" :class="$style.header" @click="toggleExpanded">
			<AgentAvatar :kind="status" size="md" />
			<div :class="$style.headerTitle">
				<N8nText color="text-dark" size="medium" bold :class="$style.headerTitleText">{{
					input
				}}</N8nText>
				<N8nText :color="statusColor" size="small">{{ statusText }}</N8nText>
			</div>

			<N8nText color="text-light" size="small">
				<N8nTimeAgo v-if="date" :date="date" />
				<!-- Only idle is genuinely "not run" — a waiting row has no date yet
				     either, but it's running, not never-run, so its slot stays empty
				     rather than claiming the wrong thing. -->
				<span v-else-if="status === 'idle'">
					{{ i18n.baseText('instanceAi.testAgentPreview.avatar.notRun') }}
				</span>
			</N8nText>

			<button
				v-if="canExpand"
				type="button"
				:class="$style.expandToggle"
				:data-test-id="testId && `${testId}-toggle`"
			>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>

		<div v-else :class="$style.header" @click="onOpen">
			<AgentAvatar :kind="status" size="xs" />
			<div :class="$style.headerTitle">
				<N8nText v-if="label" color="text-light" size="small">{{ label }}</N8nText>
				<N8nText color="text-dark" :class="$style.inputText" size="small">{{ input }}</N8nText>
			</div>
			<button
				v-if="canExpand"
				type="button"
				:class="$style.expandToggle"
				:data-test-id="testId && `${testId}-toggle`"
			>
				<N8nIcon icon="chevron-right" size="small" />
			</button>
		</div>
		<div
			v-if="expanded && canExpand"
			:class="$style.sample"
			:data-test-id="testId && `${testId}-placeholder`"
		>
			<div :class="$style.whatToCheck">
				<div :class="$style.whatToCheckHeader">
					<N8nText v-if="whatToCheck" bold color="text-dark" size="medium">{{
						i18n.baseText('instanceAi.testAgentPreview.rule')
					}}</N8nText>
					<div v-if="!editingWhatToCheck" :class="$style.whatToCheckActions">
						<!-- Only the rule is editable; a case with no criteria column can still be deleted. -->
						<N8nButton
							v-if="whatToCheck"
							variant="subtle"
							size="small"
							icon-only
							:disabled="disabled"
							:aria-label="i18n.baseText('instanceAi.testAgentPreview.editRule')"
							:data-test-id="testId && `${testId}-edit-rule`"
							@click="onStartEditWhatToCheck"
						>
							<template #icon>
								<N8nIcon icon="pencil" size="small" />
							</template>
						</N8nButton>
						<N8nButton
							variant="subtle"
							size="small"
							icon-only
							:disabled="disabled"
							:aria-label="i18n.baseText('instanceAi.testAgentPreview.deleteCheck.label')"
							:data-test-id="testId && `${testId}-delete-check`"
							@click="onDeleteCheck"
						>
							<template #icon>
								<N8nIcon icon="trash-2" size="small" />
							</template>
						</N8nButton>
					</div>
				</div>

				<template v-if="whatToCheck">
					<N8nText v-if="!editingWhatToCheck" color="text-dark" size="medium">{{
						whatToCheck
					}}</N8nText>
					<div v-else :class="$style.whatToCheckEdit">
						<N8nInput
							v-model="whatToCheckDraft"
							size="medium"
							:data-test-id="testId && `${testId}-rule-input`"
							@keydown.meta.enter="onSaveWhatToCheck"
							@keydown.ctrl.enter="onSaveWhatToCheck"
							@keydown.esc="onCancelEditWhatToCheck"
						/>
						<N8nButton
							variant="solid"
							size="small"
							:disabled="!whatToCheckDraft.trim()"
							:data-test-id="testId && `${testId}-rule-save`"
							@click="onSaveWhatToCheck"
						>
							{{ i18n.baseText('generic.save') }}
						</N8nButton>
						<N8nButton
							variant="subtle"
							size="small"
							:data-test-id="testId && `${testId}-rule-cancel`"
							@click="onCancelEditWhatToCheck"
						>
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
					</div>
				</template>
			</div>
			<N8nText bold color="text-dark" size="medium">{{
				i18n.baseText('instanceAi.testAgentPreview.conversation')
			}}</N8nText>
			<div>
				<EvalInitialSample
					:preview-input="input"
					:preview-output="output ?? ''"
					:error-message="errorMessage ?? undefined"
					:status="status"
					:tool-calls="toolCalls"
					:project-id="projectId"
				/>
				<div v-if="!practiceBannerDismissed" :class="$style.practiceBanner">
					<N8nText size="small">
						<strong> {{ i18n.baseText('instanceAi.testAgentPreview.practiceRunTitle') }}. </strong>
						{{ i18n.baseText('instanceAi.testAgentPreview.practiceRunDescription') }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="xsmall"
						:data-test-id="testId && `${testId}-practice-banner-dismiss`"
						@click="dismissPracticeBanner"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.gotIt') }}
					</N8nButton>
				</div>
			</div>

			<template v-if="needsCorrection">
				<template v-if="!hideRevise">
					<N8nText bold color="text-dark" :class="$style.correctionHint">
						{{ i18n.baseText('instanceAi.testAgentPreview.inputCorrectionHint') }}
					</N8nText>
					<N8nInput
						v-model="suggestion"
						type="textarea"
						:autosize="{ minRows: 2, maxRows: 6 }"
						:disabled="disabled"
						:placeholder="i18n.baseText('instanceAi.testAgentPreview.inputCorrectionPlaceholder')"
						:data-test-id="testId && `${testId}-suggestion`"
						@keydown.meta.enter="onSaveCheck"
						@keydown.ctrl.enter="onSaveCheck"
					/>
				</template>
				<div :class="$style.correctionActions">
					<N8nButton
						v-if="!hideRevise"
						variant="solid"
						size="small"
						:disabled="disabled || !suggestion.trim()"
						:loading="savingCheck"
						:data-test-id="testId && `${testId}-save-check`"
						@click="onSaveCheck"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.saveCorrection') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="disabled || savingCheck"
						:data-test-id="testId && `${testId}-actually-fine`"
						@click="onActuallyFine"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.actuallyFine') }}
					</N8nButton>
				</div>
			</template>
			<template v-else-if="!hideRevise">
				<div :class="$style.correctionActions">
					<N8nButton
						size="small"
						variant="subtle"
						:disabled="disabled"
						:loading="runningCheck"
						:data-test-id="testId && `${testId}-run-check`"
						@click="onRunCheck"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.runCheck') }}
					</N8nButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	cursor: pointer;
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.headerTitleText {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.inputText {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.whatToCheck {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin-bottom: var(--spacing--2xs);
}

.whatToCheckHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.whatToCheckActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: auto;
}

.whatToCheckEdit {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.whatToCheckEdit > :first-child {
	flex: 1;
}

.expandToggle {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--text-color--subtler);
}

.sample {
	border-left: var(--border);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm) 32px;
	margin-left: var(--spacing--xs);
}

.correctionHint {
	display: block;
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--2xs);
}

.correctionActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.practiceBanner {
	margin-top: -10px;
	border: var(--border);
	border-color: var(--callout--border-color--warning);
	background-color: var(--callout--color--background--warning);
	color: var(--callout--color--text--warning);
	display: flex;
	gap: 1em;
	justify-content: space-between;
	align-items: center;

	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	display: flex;
	padding: 9px 10px 9px 12px;
}
</style>
