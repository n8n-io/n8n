<script setup lang="ts">
/**
 * One eval case as a single row: a status avatar, the request text, and —
 * once it has run, or it needs correction — a chevron that expands to the
 * full input/output sample. A case with no output and nothing to correct has
 * nothing to expand, so the chevron is hidden; an idle (never-run) case says
 * so in its place. A "needs work" or "couldn't finish" case still expands
 * with no output, to reach the correction form.
 */
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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
	/** True from "Save check" until the regenerate-and-rerun request resolves. */
	savingCheck?: boolean;
}>();

const emit = defineEmits<{
	/** The user's note on what the response should have done instead. */
	'save-check': [suggestion: string];
	'actually-fine': [];
}>();

const i18n = useI18n();

const expanded = ref(false);
const suggestion = ref('');

// A case the judge marked as needing work or unable to finish gets a chance to
// say what should have happened instead — a passed or not-yet-run case has
// nothing to correct.
const needsCorrection = computed(() => props.status === 'work' || props.status === 'fail');
// A "couldn't finish" case often has no output at all — it must still expand
// to reach the correction form, so this isn't gated on output alone.
const canExpand = computed(() => props.output !== null || needsCorrection.value);
const showNotRun = computed(() => props.status === 'idle' && props.output === null);

function toggleExpanded() {
	if (!canExpand.value) return;
	expanded.value = !expanded.value;
}

function onSaveCheck() {
	const value = suggestion.value.trim();
	if (!value) return;
	emit('save-check', value);
}

function onActuallyFine() {
	emit('actually-fine');
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
	<div :class="$style.root" :data-test-id="testId">
		<div :class="$style.header">
			<AgentAvatar :kind="status" size="sm" />
			<N8nText v-if="label" color="text-light" size="small">{{ label }}</N8nText>
			<N8nText color="text-dark" :class="$style.inputText" size="small">{{ input }}</N8nText>
			<N8nText v-if="showNotRun" color="text-light" size="small">
				{{ i18n.baseText('instanceAi.testAgentPreview.avatar.notRun') }}
			</N8nText>
			<button
				v-else-if="canExpand"
				type="button"
				:class="$style.expandToggle"
				:data-test-id="testId && `${testId}-toggle`"
				@click="toggleExpanded"
			>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>
		<div
			v-if="expanded && canExpand"
			:class="$style.sample"
			:data-test-id="testId && `${testId}-placeholder`"
		>
			<EvalInitialSample :preview-input="input" :preview-output="output ?? ''" />

			<template v-if="needsCorrection">
				<N8nText bold color="text-dark" :class="$style.correctionHint">
					{{ i18n.baseText('instanceAi.testAgentPreview.inputCorrectionHint') }}
				</N8nText>
				<N8nInput
					v-model="suggestion"
					type="textarea"
					:autosize="{ minRows: 2, maxRows: 6 }"
					:placeholder="i18n.baseText('instanceAi.testAgentPreview.inputCorrectionPlaceholder')"
					:data-test-id="testId && `${testId}-suggestion`"
					@keydown.meta.enter="onSaveCheck"
					@keydown.ctrl.enter="onSaveCheck"
				/>
				<div :class="$style.correctionActions">
					<N8nButton
						variant="solid"
						size="small"
						:disabled="!suggestion.trim()"
						:loading="savingCheck"
						:data-test-id="testId && `${testId}-save-check`"
						@click="onSaveCheck"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.saveCorrection') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="savingCheck"
						:data-test-id="testId && `${testId}-actually-fine`"
						@click="onActuallyFine"
					>
						{{ i18n.baseText('instanceAi.testAgentPreview.actuallyFine') }}
					</N8nButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	border: var(--border);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--lg);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.inputText {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
	margin-top: var(--spacing--xs);
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
</style>
