<script setup lang="ts">
/**
 * Under each test-chat reply: a quiet line for each code check that failed,
 * and the person's own verdict. A pass shows nothing. The verdict is the label;
 * nothing grades the reply for them. The verdict saves the turn as a test case
 * (the server keeps the message, the answer or note, and the tool data), with
 * Undo. Telemetry gets the verdict and the note length, never the note.
 * A saved reply shows as saved after a reload. A message the person asked in
 * earlier test chats gets one suggestion to save it, with "Not now".
 * In the Sessions view, a live reply passes the checks that already ran on it
 * (`liveIssues`), so nothing is computed again.
 */
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { fetchReplyChecks, removeTestCase, saveTestCase } from '../agentEvals.api';
import type { AgentReplyIssue, AgentSavedTestCase } from '../agentEvals.types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { forgetSaved, rememberSaved, savedCaseFor } from '../composables/useSavedTestCases';

const props = defineProps<{
	projectId: string;
	agentId: string;
	threadId: string;
	executionId: string;
	/** The live checks that failed on this reply, from the Sessions view. */
	liveIssues?: AgentReplyIssue[];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const agentTelemetry = useAgentTelemetry();

const issues = ref<AgentReplyIssue[]>([]);
const verdict = ref<'looks-right' | 'not-right' | null>(null);
const writingNote = ref(false);
const draft = ref('');
const note = ref('');
const saved = ref<AgentSavedTestCase | null>(null);
const saveError = ref<string | null>(null);
const askedBefore = ref(0);
const dismissKey = computed(
	() => `n8n-agents-test-repeat-dismissed:${props.agentId}:${props.executionId}`,
);
const askedBeforeDismissed = ref(readDismissed());

function readDismissed(): boolean {
	try {
		return localStorage.getItem(dismissKey.value) === '1';
	} catch {
		return false;
	}
}

const showAskedBefore = computed(
	() =>
		askedBefore.value > 0 && !verdict.value && !writingNote.value && !askedBeforeDismissed.value,
);
const askedBeforeText = computed(() =>
	askedBefore.value === 1
		? i18n.baseText('agents.testChat.review.askedBeforeOne')
		: i18n.baseText('agents.testChat.review.askedBeforeMany', {
				interpolate: { count: String(askedBefore.value) },
			}),
);

function onDismissAskedBefore() {
	askedBeforeDismissed.value = true;
	try {
		localStorage.setItem(dismissKey.value, '1');
	} catch {
		// Without storage the suggestion stays hidden until the page reloads.
	}
}

const canSaveNote = computed(() => draft.value.trim().length > 0);
const noteForm = useTemplateRef<HTMLFormElement>('noteForm');

onMounted(async () => {
	if (props.liveIssues) issues.value = props.liveIssues;
	await Promise.all([props.liveIssues ? Promise.resolve() : loadChecks(), loadSaved()]);
});

async function loadChecks() {
	try {
		const result = await fetchReplyChecks(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			props.threadId,
			props.executionId,
		);
		issues.value = result.issues;
		askedBefore.value = result.askedBefore ?? 0;
	} catch {
		// The checks are a hint. Without them the person can still judge the reply.
	}
}

async function loadSaved() {
	try {
		const record = await savedCaseFor(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			props.threadId,
			props.executionId,
		);
		// A verdict given while this loaded wins over the saved one.
		if (!record || verdict.value) return;
		verdict.value = record.verdict;
		note.value = record.note ?? '';
		saved.value = record;
	} catch {
		// Without the lookup the reply shows the buttons, as before a save.
	}
}

async function record(value: 'looks-right' | 'not-right', noteText: string) {
	verdict.value = value;
	note.value = noteText;
	saveError.value = null;
	agentTelemetry.trackJudgedTestReply({
		agentId: props.agentId,
		executionId: props.executionId,
		verdict: value,
		noteLength: noteText.length,
		hadCheckIssues: issues.value.length > 0,
	});
	try {
		saved.value = await saveTestCase(rootStore.restApiContext, props.projectId, props.agentId, {
			threadId: props.threadId,
			executionId: props.executionId,
			verdict: value,
			...(value === 'not-right' ? { note: noteText } : {}),
		});
		await rememberSaved(props.agentId, props.threadId, {
			...saved.value,
			executionId: props.executionId,
			verdict: value,
			...(value === 'not-right' ? { note: noteText } : {}),
		});
	} catch (error) {
		saveError.value = error instanceof Error ? error.message : String(error);
	}
}

/** Removes the saved case, if any. A failed removal keeps it and says so. */
async function unsave(): Promise<boolean> {
	if (!saved.value) return true;
	try {
		await removeTestCase(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			saved.value.datasetId,
			saved.value.rowId,
		);
		saved.value = null;
		await forgetSaved(props.agentId, props.threadId, props.executionId);
		return true;
	} catch (error) {
		saveError.value = error instanceof Error ? error.message : String(error);
		return false;
	}
}

async function onLooksRight() {
	await record('looks-right', '');
}

async function onSaveNote() {
	if (!canSaveNote.value) return;
	writingNote.value = false;
	await record('not-right', draft.value.trim());
}

// The last reply sits at the bottom of the chat, so the form would open out of view.
async function onOpenNote() {
	writingNote.value = true;
	await nextTick();
	noteForm.value?.scrollIntoView?.({ block: 'nearest' });
}

function onCancelNote() {
	writingNote.value = false;
	draft.value = '';
}

async function onUndo() {
	if (await unsave()) verdict.value = null;
}

async function onChange() {
	if (!(await unsave())) return;
	verdict.value = null;
	saveError.value = null;
	draft.value = note.value;
}

const savedText = computed(() => {
	const count = saved.value?.toolCalls ?? 0;
	if (count === 0) return i18n.baseText('agents.testChat.review.saved');
	return i18n.baseText(
		count === 1 ? 'agents.testChat.review.savedWithTool' : 'agents.testChat.review.savedWithTools',
		{ interpolate: { count: String(count) } },
	);
});
</script>

<template>
	<div :class="$style.review" data-testid="agent-test-reply-review">
		<p
			v-for="issue in issues"
			:key="issue.checkId"
			:class="$style.issue"
			data-testid="agent-test-reply-issue"
		>
			<N8nIcon icon="triangle-alert" size="small" :class="$style.issueIcon" />
			<N8nText size="small" color="text-base">{{ issue.reason }}</N8nText>
		</p>

		<div
			v-if="showAskedBefore"
			:class="$style.askedBefore"
			data-testid="agent-test-reply-asked-before"
		>
			<N8nIcon icon="repeat" size="small" :class="$style.askedBeforeIcon" />
			<N8nText size="small" color="text-base" :class="$style.askedBeforeText">
				{{ askedBeforeText }}
			</N8nText>
			<N8nButton
				variant="ghost"
				size="xsmall"
				data-testid="agent-test-reply-asked-before-dismiss"
				@click="onDismissAskedBefore"
			>
				{{ i18n.baseText('agents.testChat.review.notNow') }}
			</N8nButton>
		</div>

		<template v-if="verdict">
			<div :class="$style.judged" data-testid="agent-test-reply-judged">
				<N8nIcon
					:icon="verdict === 'looks-right' ? 'circle-check' : 'message-square'"
					size="small"
					:class="$style.judgedIcon"
				/>
				<N8nText size="small" color="text-light" :class="$style.judgedText">
					{{
						verdict === 'looks-right'
							? i18n.baseText('agents.testChat.review.markedRight')
							: i18n.baseText('agents.testChat.review.markedNotRight', {
									interpolate: { note },
								})
					}}
				</N8nText>
				<N8nButton
					variant="ghost"
					size="xsmall"
					data-testid="agent-test-reply-change"
					@click="onChange"
				>
					{{ i18n.baseText('agents.testChat.review.change') }}
				</N8nButton>
			</div>
			<div v-if="saved" :class="$style.saved" data-testid="agent-test-reply-saved">
				<N8nText size="small" color="text-light">{{ savedText }}</N8nText>
				<N8nButton
					variant="ghost"
					size="xsmall"
					data-testid="agent-test-reply-undo"
					@click="onUndo"
				>
					{{ i18n.baseText('agents.testChat.review.undo') }}
				</N8nButton>
			</div>
			<N8nText
				v-if="saveError"
				size="small"
				color="danger"
				role="alert"
				data-testid="agent-test-reply-save-error"
			>
				{{
					i18n.baseText('agents.testChat.review.saveError', {
						interpolate: { message: saveError },
					})
				}}
			</N8nText>
		</template>

		<form
			v-else-if="writingNote"
			ref="noteForm"
			:class="$style.noteForm"
			@submit.prevent="onSaveNote"
		>
			<N8nInput
				v-model="draft"
				type="textarea"
				:rows="2"
				autofocus
				:aria-label="i18n.baseText('agents.testChat.review.noteLabel')"
				:placeholder="i18n.baseText('agents.testChat.review.notePlaceholder')"
				data-testid="agent-test-reply-note"
			/>
			<div :class="$style.noteActions">
				<N8nButton
					variant="ghost"
					size="xsmall"
					type="button"
					data-testid="agent-test-reply-cancel-note"
					@click="onCancelNote"
				>
					{{ i18n.baseText('agents.testChat.review.cancelNote') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					size="xsmall"
					type="submit"
					:disabled="!canSaveNote"
					data-testid="agent-test-reply-save-note"
				>
					{{ i18n.baseText('agents.testChat.review.saveNote') }}
				</N8nButton>
			</div>
		</form>

		<div v-else :class="$style.verdict">
			<N8nButton
				variant="outline"
				size="xsmall"
				icon="check"
				data-testid="agent-test-reply-looks-right"
				@click="onLooksRight"
			>
				{{ i18n.baseText('agents.testChat.review.looksRight') }}
			</N8nButton>
			<N8nButton
				variant="ghost"
				size="xsmall"
				data-testid="agent-test-reply-not-right"
				@click="onOpenNote"
			>
				{{ i18n.baseText('agents.testChat.review.notRight') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.review {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	min-width: 0;
}

.issue {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	margin: 0;
	overflow-wrap: anywhere;
}

.issueIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--color--warning);
}

.verdict,
.judged,
.saved,
.noteActions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.askedBefore {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.askedBeforeIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--color--primary);
}

.askedBeforeText {
	flex: 1;
	min-width: 0;
}

.judged {
	flex-wrap: nowrap;
	align-items: flex-start;
}

.judgedIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--color--text--tint-1);
}

.judgedText {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

.noteForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-width: 32rem;
}

.noteActions {
	justify-content: flex-end;
}
</style>
