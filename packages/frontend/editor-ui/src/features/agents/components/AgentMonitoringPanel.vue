<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentOnlineRubric } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { emptyMonitoring, useAgentMonitoringStore } from '../agentMonitoring.store';
import AgentOnlineChecksTable from './AgentOnlineChecksTable.vue';
import AgentOnlineRubricReview from './AgentOnlineRubricReview.vue';

/**
 * Prototype of live monitoring for a published agent: write checks from the
 * agent's definition, let a person approve them, then check every session.
 */
const props = defineProps<{ projectId: string; agentId: string; disabled?: boolean }>();
const emit = defineEmits<{ 'view-sessions': [] }>();

const i18n = useI18n();
const monitoring = useAgentMonitoringStore();
const state = computed(() => monitoring.byAgent[props.agentId] ?? emptyMonitoring());
const rubric = computed(() => state.value.rubric);
const approved = computed(() => Boolean(rubric.value?.approvedAt));
const editing = ref(false);

async function onGenerate() {
	editing.value = false;
	await monitoring.generate(props.projectId, props.agentId);
}

function onUpdated(updated: AgentOnlineRubric) {
	monitoring.setRubric(props.agentId, updated);
}

watch(
	() => [props.projectId, props.agentId],
	async () => {
		editing.value = false;
		await monitoring.load(props.projectId, props.agentId);
		if (monitoring.setupRequestedFor !== props.agentId) return;
		monitoring.setupRequestedFor = null;
		if (!state.value.rubric) await onGenerate();
	},
	{ immediate: true },
);
// The popover can ask for setup while this tab is already open.
watch(
	() => monitoring.setupRequestedFor,
	async (agentId) => {
		if (agentId !== props.agentId || !state.value.loaded) return;
		monitoring.setupRequestedFor = null;
		if (!state.value.rubric) await onGenerate();
	},
);
</script>

<template>
	<section :class="$style.panel" data-testid="agent-monitoring">
		<N8nCallout v-if="state.error" theme="danger">{{ state.error }}</N8nCallout>

		<div v-if="!state.loaded" :class="$style.line" role="status">
			<N8nSpinner size="small" /><N8nText size="small">{{
				i18n.baseText('agents.monitoring.loading')
			}}</N8nText>
		</div>

		<div v-else-if="state.generating" :class="$style.intro" role="status">
			<div :class="$style.line">
				<N8nSpinner size="small" />
				<N8nText size="medium" color="text-dark" bold>{{
					i18n.baseText('agents.monitoring.generating')
				}}</N8nText>
			</div>
			<N8nText size="small" color="text-base">{{
				i18n.baseText('agents.monitoring.generatingDescription')
			}}</N8nText>
		</div>

		<div v-else-if="!rubric" :class="$style.intro" data-testid="agent-monitoring-setup">
			<N8nText size="medium" color="text-dark" bold>{{
				i18n.baseText('agents.monitoring.setup.title')
			}}</N8nText>
			<N8nText size="small" color="text-base">{{
				i18n.baseText('agents.monitoring.setup.description')
			}}</N8nText>
			<div :class="$style.line">
				<N8nButton
					variant="solid"
					size="medium"
					:disabled="disabled"
					data-testid="agent-monitoring-generate"
					@click="onGenerate"
					>{{ i18n.baseText('agents.monitoring.setup.generate') }}</N8nButton
				>
			</div>
		</div>

		<template v-else>
			<div :class="$style.intro" data-testid="agent-monitoring-summary">
				<div :class="$style.line">
					<N8nText size="medium" color="text-dark" bold :class="$style.grow">{{
						i18n.baseText(
							approved ? 'agents.monitoring.on.title' : 'agents.monitoring.review.title',
						)
					}}</N8nText>
					<span
						:class="[$style.chip, approved && $style.chipOn]"
						data-testid="agent-monitoring-status"
						>{{
							i18n.baseText(
								approved ? 'agents.monitoring.status.on' : 'agents.monitoring.status.off',
							)
						}}</span
					>
				</div>
				<N8nText size="small" color="text-base">{{
					i18n.baseText(
						approved ? 'agents.monitoring.on.description' : 'agents.monitoring.review.description',
					)
				}}</N8nText>
				<div v-if="state.checking.length" :class="$style.line" role="status" aria-live="polite">
					<N8nSpinner size="small" />
					<N8nText size="small">{{
						i18n.baseText('agents.monitoring.checking', {
							interpolate: { count: String(state.checking.length) },
						})
					}}</N8nText>
				</div>
				<div :class="$style.line">
					<template v-if="approved">
						<N8nButton
							variant="solid"
							size="medium"
							data-testid="agent-monitoring-view-sessions"
							@click="emit('view-sessions')"
							>{{ i18n.baseText('agents.monitoring.viewSessions') }}</N8nButton
						>
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="disabled"
							data-testid="agent-monitoring-edit"
							@click="editing = !editing"
							>{{
								i18n.baseText(
									editing ? 'agents.monitoring.doneEditing' : 'agents.monitoring.editChecks',
								)
							}}</N8nButton
						>
					</template>
					<template v-else>
						<N8nButton
							variant="solid"
							size="medium"
							:disabled="disabled"
							data-testid="agent-monitoring-approve"
							@click="monitoring.approve(projectId, agentId)"
							>{{ i18n.baseText('agents.monitoring.approve') }}</N8nButton
						>
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="disabled"
							data-testid="agent-monitoring-edit"
							@click="editing = !editing"
							>{{
								i18n.baseText(
									editing ? 'agents.monitoring.doneEditing' : 'agents.monitoring.editChecks',
								)
							}}</N8nButton
						>
						<N8nButton
							variant="ghost"
							size="medium"
							:disabled="disabled"
							data-testid="agent-monitoring-regenerate"
							@click="onGenerate"
							>{{ i18n.baseText('agents.monitoring.regenerate') }}</N8nButton
						>
					</template>
				</div>
			</div>
			<AgentOnlineRubricReview
				v-if="editing"
				:rubric="rubric"
				:activity="state.activity"
				:project-id="projectId"
				:agent-id="agentId"
				:disabled="disabled"
				history-state="ready"
				@updated="onUpdated"
			/>
			<AgentOnlineChecksTable v-else :rubric="rubric" :activity="state.activity" />
		</template>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--subtle);
}
.line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}
.grow {
	flex: 1;
	min-width: 0;
}
.chip {
	padding: var(--spacing--5xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--full);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
.chipOn {
	border-color: var(--color--success);
	color: var(--color--success);
}
</style>
