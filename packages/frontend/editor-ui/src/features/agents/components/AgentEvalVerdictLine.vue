<script setup lang="ts">
/**
 * One line at the top of the Checks tab that sums up the latest run: what needs
 * work, that everything passes, or how far a run has got. The sentence is a
 * template on the judge's reasoning, because the backend writes no summary.
 * "Details" opens what happened on each failing check, inside the same card.
 */
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils/string/truncate';

import { readFirstSentence } from '../utils/agent-eval-review';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';

export type VerdictLineCheck = {
	id: string;
	status: AgentAvatarKind;
	input: string;
	output: string | null;
	whatToCheck: string | null;
	/** The judge's reasoning, or why the check could not finish. */
	reasoning: string | null;
};

const props = defineProps<{
	checks: VerdictLineCheck[];
	running?: boolean;
	/** Finished checks of the run in flight. */
	done?: number;
	/** All checks of the run in flight. */
	total?: number;
	/** When the shown run finished. */
	completedAt?: string | null;
	/** True while the Assistant has the fix: the actions are there, not here. */
	hideFix?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	fix: [failing: VerdictLineCheck[]];
}>();

const i18n = useI18n();

/** The longest reply the details quote, so one long answer does not fill the card. */
const REPLY_PREVIEW_LENGTH = 140;
/** From this many failing checks on, the line counts them instead of quoting one. */
const MANY_FAILING = 3;

const failing = computed(() =>
	props.checks.filter((check) => check.status === 'work' || check.status === 'fail'),
);
const passedCount = computed(
	() => props.checks.filter((check) => check.status === 'pass' || check.status === 'strong').length,
);

type VerdictState = 'running' | 'needs-work' | 'pass';

const state = computed<VerdictState | null>(() => {
	if (props.running) return 'running';
	if (failing.value.length > 0) return 'needs-work';
	if (passedCount.value > 0) return 'pass';
	return null;
});

const avatarKind = computed<AgentAvatarKind>(() => {
	if (state.value === 'running') return 'waiting';
	if (state.value === 'pass') return 'pass';
	return 'work';
});

const sentence = computed(() => {
	if (state.value === 'running') {
		return i18n.baseText('agents.builder.agentEvals.verdict.running', {
			interpolate: { done: String(props.done ?? 0), total: String(props.total ?? 0) },
		});
	}
	if (state.value === 'pass') {
		return i18n.baseText('agents.builder.agentEvals.verdict.allPass', {
			adjustToNumber: passedCount.value,
			interpolate: { count: String(passedCount.value) },
		});
	}
	const count = failing.value.length;
	if (count >= MANY_FAILING) {
		return i18n.baseText('agents.builder.agentEvals.verdict.manyNeedWork', {
			interpolate: { count: String(count) },
		});
	}
	const first = failing.value[0];
	const reason = readFirstSentence(first?.reasoning);
	if (reason) return reason;
	return i18n.baseText('agents.builder.agentEvals.verdict.someNeedWork', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

const detailsOpen = ref(false);
// A run that no longer needs work has no details to show.
watch(state, (next) => {
	if (next !== 'needs-work') detailsOpen.value = false;
});

function whatHappened(check: VerdictLineCheck) {
	const input = check.input;
	if (check.output === null) {
		return i18n.baseText('agents.builder.agentEvals.verdict.whatHappenedNoReply', {
			interpolate: { input },
		});
	}
	return i18n.baseText('agents.builder.agentEvals.verdict.whatHappenedText', {
		interpolate: { input, output: truncate(check.output, REPLY_PREVIEW_LENGTH) },
	});
}

function onFix() {
	emit('fix', failing.value);
}
</script>

<template>
	<section
		v-if="state"
		:class="$style.card"
		:data-state="state"
		data-testid="agent-eval-verdict-line"
	>
		<div :class="$style.line">
			<AgentAvatar :kind="avatarKind" size="md" />
			<N8nText
				color="text-dark"
				size="medium"
				:class="$style.sentence"
				data-testid="agent-eval-verdict-sentence"
				>{{ sentence }}</N8nText
			>
			<div v-if="state === 'needs-work'" :class="$style.actions">
				<N8nButton
					variant="ghost"
					size="small"
					:aria-expanded="detailsOpen"
					data-testid="agent-eval-verdict-details"
					@click="detailsOpen = !detailsOpen"
				>
					{{
						i18n.baseText(
							detailsOpen
								? 'agents.builder.agentEvals.verdict.hideDetails'
								: 'agents.builder.agentEvals.verdict.details',
						)
					}}
					<N8nIcon :icon="detailsOpen ? 'chevron-up' : 'chevron-down'" size="small" />
				</N8nButton>
				<N8nButton
					v-if="!hideFix"
					variant="solid"
					size="small"
					:disabled="disabled"
					data-testid="agent-eval-verdict-fix"
					@click="onFix"
				>
					{{ i18n.baseText('agents.builder.agentEvals.verdict.fix') }}
				</N8nButton>
			</div>
			<N8nText
				v-else-if="state === 'pass' && completedAt"
				color="text-light"
				size="small"
				:class="$style.lastRun"
				data-testid="agent-eval-verdict-last-run"
			>
				{{ i18n.baseText('agents.builder.agentEvals.verdict.lastRun') }}
				<N8nTimeAgo :date="completedAt" />
			</N8nText>
		</div>

		<div
			v-if="state === 'needs-work' && detailsOpen"
			:class="$style.details"
			data-testid="agent-eval-verdict-details-body"
		>
			<div v-for="check in failing" :key="check.id" :class="$style.block">
				<N8nText
					v-if="failing.length > 1 && check.whatToCheck"
					tag="p"
					color="text-dark"
					size="medium"
					:class="$style.blockTitle"
					>{{ check.whatToCheck }}</N8nText
				>
				<div :class="$style.field">
					<N8nText color="text-light" size="small" :class="$style.label">
						{{ i18n.baseText('agents.builder.agentEvals.verdict.whatHappened') }}
					</N8nText>
					<N8nText color="text-dark" size="small" :class="$style.value">{{
						whatHappened(check)
					}}</N8nText>
				</div>
				<div v-if="check.whatToCheck" :class="$style.field">
					<N8nText color="text-light" size="small" :class="$style.label">
						{{ i18n.baseText('agents.builder.agentEvals.verdict.expected') }}
					</N8nText>
					<N8nText color="text-dark" size="small" :class="$style.value">{{
						check.whatToCheck
					}}</N8nText>
				</div>
				<div v-if="check.reasoning" :class="$style.field">
					<N8nText color="text-light" size="small" :class="$style.label">
						{{ i18n.baseText('agents.builder.agentEvals.verdict.why') }}
					</N8nText>
					<N8nText color="text-dark" size="small" :class="$style.value">{{
						check.reasoning
					}}</N8nText>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--xl);
	background-color: var(--background--surface);
}

.line {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-height: var(--spacing--3xl);
	padding: var(--spacing--2xs) var(--spacing--sm);
	box-sizing: border-box;
}

.sentence {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.lastRun {
	flex-shrink: 0;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
}

.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.blockTitle {
	margin: 0 0 var(--spacing--4xs);
	font-weight: var(--font-weight--medium);
}

.field {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
}

.label {
	flex: 0 0 var(--spacing--4xl);
}

.value {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}
</style>
