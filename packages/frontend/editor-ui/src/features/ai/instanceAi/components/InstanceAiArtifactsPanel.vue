<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import type { PlanStep } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();
const workflowsListStore = useWorkflowsListStore();

const plan = computed(() => store.currentPlan);

const completedCount = computed(() => {
	if (!plan.value) return 0;
	return plan.value.steps.filter((s) => s.status === 'completed').length;
});

const statusIconMap: Record<
	PlanStep['status'],
	{ icon: string; spin: boolean; className: string }
> = {
	pending: { icon: 'circle', spin: false, className: 'pendingIcon' },
	in_progress: { icon: 'spinner', spin: true, className: 'inProgressIcon' },
	completed: { icon: 'check', spin: false, className: 'completedIcon' },
	failed: { icon: 'x', spin: false, className: 'failedIcon' },
	skipped: { icon: 'minus', spin: false, className: 'skippedIcon' },
};

const workflowArtifacts = computed(() => {
	const result: Array<{ id: string; name: string }> = [];
	for (const entry of store.resourceRegistry.values()) {
		if (entry.type === 'workflow') {
			result.push({ id: entry.id, name: entry.name });
		}
	}
	return result;
});

const hasArtifacts = computed(() => plan.value !== null || workflowArtifacts.value.length > 0);

const expandedCards = ref<Set<string>>(new Set());

function toggleCard(key: string) {
	if (expandedCards.value.has(key)) {
		expandedCards.value.delete(key);
	} else {
		expandedCards.value.add(key);
	}
}

// Auto-expand plan card when it first appears
watch(plan, (newPlan, oldPlan) => {
	if (newPlan && !oldPlan) {
		expandedCards.value.add('plan');
	}
});

const previewWorkflows = ref<Map<string, IWorkflowDb>>(new Map());

watch(
	() => workflowArtifacts.value.length,
	async () => {
		for (const wf of workflowArtifacts.value) {
			if (previewWorkflows.value.has(wf.id)) continue;
			try {
				const full = await workflowsListStore.fetchWorkflow(wf.id);
				previewWorkflows.value.set(wf.id, full);
			} catch {
				/* non-critical */
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="layers" size="small" />
				<span>{{ i18n.baseText('instanceAi.artifactsPanel.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div v-if="hasArtifacts" :class="$style.cardList">
			<!-- Plan card -->
			<div v-if="plan" :class="$style.artifactCard" @click="toggleCard('plan')">
				<div :class="$style.cardHeader">
					<N8nIcon
						:icon="expandedCards.has('plan') ? 'chevron-down' : 'chevron-right'"
						:class="$style.chevron"
						size="small"
					/>
					<N8nIcon icon="list-checks" size="small" />
					<span :class="$style.artifactName">{{ plan.goal }}</span>
					<span :class="$style.typeBadge">{{
						i18n.baseText('instanceAi.artifactsPanel.plan')
					}}</span>
				</div>
				<div v-if="expandedCards.has('plan')" :class="$style.expandedContent">
					<div :class="$style.metaRow">
						<span :class="$style.phaseBadge">{{ plan.currentPhase }}</span>
						<span :class="$style.iteration">
							{{ i18n.baseText('instanceAi.planCard.iteration') }}: {{ plan.iteration }}
						</span>
						<span :class="$style.progress">
							{{ completedCount }}/{{ plan.steps.length }} steps done
						</span>
					</div>
					<div :class="$style.stepList">
						<div
							v-for="(step, idx) in plan.steps"
							:key="idx"
							:class="[$style.step, step.status === 'skipped' ? $style.skippedStep : '']"
						>
							<N8nIcon
								:icon="statusIconMap[step.status].icon as IconName"
								:class="$style[statusIconMap[step.status].className]"
								:spin="statusIconMap[step.status].spin"
								size="small"
							/>
							<div :class="$style.stepContent">
								<div :class="$style.stepHeader">
									<span :class="$style.stepPhase">{{ step.phase }}</span>
									<span v-if="step.toolCallId" :class="$style.linkedBadge">linked</span>
								</div>
								<span :class="$style.stepDescription">{{ step.description }}</span>
								<span v-if="step.result" :class="$style.stepResult">{{ step.result }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Workflow cards -->
			<div
				v-for="wf in workflowArtifacts"
				:key="wf.id"
				:class="$style.artifactCard"
				@click="toggleCard(wf.id)"
			>
				<div :class="$style.cardHeader">
					<N8nIcon
						:icon="expandedCards.has(wf.id) ? 'chevron-down' : 'chevron-right'"
						:class="$style.chevron"
						size="small"
					/>
					<N8nIcon icon="workflow" size="small" />
					<span :class="$style.artifactName">{{ wf.name }}</span>
					<span :class="$style.typeBadge">Workflow</span>
					<RouterLink
						:to="`/workflow/${wf.id}`"
						target="_blank"
						:class="$style.openLink"
						@click.stop
					>
						{{ i18n.baseText('instanceAi.artifactsPanel.openWorkflow') }}
					</RouterLink>
				</div>
				<div v-if="expandedCards.has(wf.id)" :class="$style.expandedContent">
					<div v-if="previewWorkflows.has(wf.id)" :class="$style.previewContainer">
						<WorkflowMiniCanvas
							:workflow="previewWorkflows.get(wf.id)!"
							:canvas-id="`artifact-${wf.id}`"
						/>
					</div>
				</div>
			</div>
		</div>

		<div v-else :class="$style.emptyState">
			{{ i18n.baseText('instanceAi.artifactsPanel.noArtifacts') }}
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 360px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.cardList {
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
	overflow-y: auto;
}

.artifactCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	cursor: pointer;
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
}

.chevron {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	transition: transform 0.15s ease;
}

.artifactName {
	font-weight: var(--font-weight--bold);
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.typeBadge {
	font-size: var(--font-size--3xs);
	padding: 1px var(--spacing--3xs);
	background: var(--color--foreground);
	border-radius: var(--radius--sm);
	text-transform: uppercase;
	color: var(--color--text);
	flex-shrink: 0;
}

.openLink {
	font-size: var(--font-size--3xs);
	color: var(--color--primary);
	text-decoration: none;
	flex-shrink: 0;
}

.expandedContent {
	padding: 0 var(--spacing--sm) var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-2);
}

.previewContainer {
	height: 120px;
	border-radius: var(--radius);
	overflow: hidden;
	margin-top: var(--spacing--4xs);
}

/* Plan detail styles */
.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
}

.phaseBadge {
	display: inline-block;
	padding: 1px var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	background: color-mix(in srgb, var(--color--primary) 15%, transparent);
	color: var(--color--primary);
	border-radius: var(--radius--sm);
}

.iteration {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.progress {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.stepList {
	padding: var(--spacing--2xs) 0;
}

.step {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	& + & {
		border-top: 1px solid var(--color--foreground--tint-2);
	}
}

.skippedStep {
	text-decoration: line-through;
	opacity: 0.6;
}

.stepContent {
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	flex: 1;
}

.stepHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.stepPhase {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
}

.linkedBadge {
	padding: 0 var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-family: monospace;
	background: var(--color--foreground);
	border-radius: var(--radius--sm);
	color: var(--color--text);
}

.stepDescription {
	color: var(--color--text);
}

.stepResult {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-style: italic;
}

.pendingIcon {
	color: var(--color--text--tint-1);
}

.inProgressIcon {
	color: var(--color--primary);
}

.completedIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
}

.skippedIcon {
	color: var(--color--text--tint-1);
}

.emptyState {
	padding: var(--spacing--lg) var(--spacing--sm);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
