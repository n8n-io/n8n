<script setup lang="ts">
/**
 * What a re-run found for a test saved from the test chat: one line for the
 * outcome, the tool calls that changed, the comparison's reason, and the
 * person's choice. "Accept new answer" makes this run the saved answer (the
 * server writes it). "Keep saved answer" changes nothing: the saved answer stays
 * the standard and the agent is what needs fixing.
 *
 * A flaky test and one that couldn't be checked offer no choice: neither says
 * the answer changed.
 */
import { computed } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { SavedTestRerun, ToolCountChange } from '../utils/agent-eval-saved-test';

const props = defineProps<{
	rerun: SavedTestRerun;
	disabled?: boolean;
	accepting?: boolean;
	/** Set once the person chose "Keep saved answer" for this result. */
	kept?: boolean;
}>();

const emit = defineEmits<{
	accept: [];
	keep: [];
}>();

const i18n = useI18n();

const counts = computed(() => ({
	failed: String(props.rerun.failedRuns),
	runs: String(props.rerun.runs),
}));

const summary = computed(() => {
	const { kind, outcome, offScriptTools } = props.rerun;
	if (outcome === 'couldnt_check') {
		return offScriptTools.length > 0
			? i18n.baseText('agents.builder.agentEvals.savedTest.summary.offScript', {
					interpolate: { tools: offScriptTools.join(', ') },
				})
			: i18n.baseText('agents.builder.agentEvals.savedTest.summary.noAnswer');
	}
	if (outcome === 'flaky') {
		return i18n.baseText('agents.builder.agentEvals.savedTest.summary.flaky', {
			interpolate: counts.value,
		});
	}
	if (kind === 'note') {
		return outcome === 'pass'
			? i18n.baseText('agents.builder.agentEvals.savedTest.summary.noteMet')
			: i18n.baseText('agents.builder.agentEvals.savedTest.summary.noteNotMet', {
					interpolate: counts.value,
				});
	}
	return outcome === 'pass'
		? i18n.baseText('agents.builder.agentEvals.savedTest.summary.same')
		: i18n.baseText('agents.builder.agentEvals.savedTest.summary.changed', {
				interpolate: counts.value,
			});
});

function toolChangeText({ tool, saved, now }: ToolCountChange): string {
	if (now === 0) {
		return i18n.baseText('agents.builder.agentEvals.savedTest.toolChange.dropped', {
			interpolate: { tool },
		});
	}
	if (saved === 0) {
		return i18n.baseText('agents.builder.agentEvals.savedTest.toolChange.added', {
			interpolate: { tool },
		});
	}
	return i18n.baseText('agents.builder.agentEvals.savedTest.toolChange.count', {
		interpolate: { tool, now: String(now), saved: String(saved) },
	});
}

const showEvidence = computed(
	() => props.rerun.outcome === 'fail' || props.rerun.outcome === 'flaky',
);

/** An answer test that changed, or a note test that now meets its note. */
const canAccept = computed(() => {
	const { kind, outcome } = props.rerun;
	return kind === 'answer' ? outcome === 'fail' : outcome === 'pass';
});
const canKeep = computed(() => props.rerun.kind === 'answer' && props.rerun.outcome === 'fail');
</script>

<template>
	<div :class="$style.rerun" data-test-id="agent-saved-test-rerun">
		<N8nText size="small" color="text-dark" data-test-id="agent-saved-test-rerun-summary">
			{{ summary }}
		</N8nText>
		<ul v-if="showEvidence && rerun.toolChanges.length > 0" :class="$style.evidence">
			<li v-for="change in rerun.toolChanges" :key="change.tool">
				<N8nText size="small" color="text-base">{{ toolChangeText(change) }}</N8nText>
			</li>
		</ul>
		<N8nText
			v-if="showEvidence && rerun.reasoning"
			size="small"
			color="text-light"
			data-test-id="agent-saved-test-rerun-reasoning"
		>
			{{ rerun.reasoning }}
		</N8nText>
		<N8nText v-if="kept" size="small" color="text-light" data-test-id="agent-saved-test-kept">
			{{ i18n.baseText('agents.builder.agentEvals.savedTest.kept') }}
		</N8nText>
		<div v-else-if="canAccept" :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				:disabled="disabled"
				:loading="accepting"
				data-test-id="agent-saved-test-accept"
				@click="emit('accept')"
			>
				{{
					rerun.kind === 'answer'
						? i18n.baseText('agents.builder.agentEvals.savedTest.acceptNewAnswer')
						: i18n.baseText('agents.builder.agentEvals.savedTest.useAsSavedAnswer')
				}}
			</N8nButton>
			<N8nButton
				v-if="canKeep"
				variant="ghost"
				size="small"
				:disabled="disabled || accepting"
				data-test-id="agent-saved-test-keep"
				@click="emit('keep')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.savedTest.keepSavedAnswer') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.rerun {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
	overflow-wrap: anywhere;
}

.evidence {
	margin: 0;
	padding-left: var(--spacing--sm);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
