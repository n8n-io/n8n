<script setup lang="ts">
/**
 * Under each test-chat reply: a quiet line for each code check that failed,
 * and the person's own verdict. A pass shows nothing. The verdict is the label;
 * nothing grades the reply for them. For now the verdict goes to telemetry only
 * (the note text stays in the browser); saving it as a test case comes next.
 */
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { fetchReplyChecks } from '../agentEvals.api';
import type { AgentReplyIssue } from '../agentEvals.types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';

const props = defineProps<{
	projectId: string;
	agentId: string;
	threadId: string;
	executionId: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const agentTelemetry = useAgentTelemetry();

const issues = ref<AgentReplyIssue[]>([]);
const verdict = ref<'looks-right' | 'not-right' | null>(null);
const writingNote = ref(false);
const draft = ref('');
const note = ref('');

const canSaveNote = computed(() => draft.value.trim().length > 0);
const noteForm = useTemplateRef<HTMLFormElement>('noteForm');

onMounted(async () => {
	try {
		const result = await fetchReplyChecks(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			props.threadId,
			props.executionId,
		);
		issues.value = result.issues;
	} catch {
		// The checks are a hint. Without them the person can still judge the reply.
	}
});

function record(value: 'looks-right' | 'not-right', noteText: string) {
	verdict.value = value;
	note.value = noteText;
	agentTelemetry.trackJudgedTestReply({
		agentId: props.agentId,
		executionId: props.executionId,
		verdict: value,
		noteLength: noteText.length,
		hadCheckIssues: issues.value.length > 0,
	});
}

function onLooksRight() {
	record('looks-right', '');
}

function onSaveNote() {
	if (!canSaveNote.value) return;
	writingNote.value = false;
	record('not-right', draft.value.trim());
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

function onChange() {
	verdict.value = null;
	draft.value = note.value;
}
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

		<div v-if="verdict" :class="$style.judged" data-testid="agent-test-reply-judged">
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
.noteActions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.judgedIcon {
	color: var(--color--text--tint-1);
}

.judgedText {
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
