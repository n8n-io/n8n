<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import type { TaskItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();
const workflowsListStore = useWorkflowsListStore();

const tasks = computed(() => store.currentTasks);

const doneCount = computed(() => {
	if (!tasks.value) return 0;
	return tasks.value.tasks.filter((t) => t.status === 'done').length;
});

const statusIconMap: Record<
	TaskItem['status'],
	{ icon: string; spin: boolean; className: string }
> = {
	todo: { icon: 'circle', spin: false, className: 'todoIcon' },
	in_progress: { icon: 'spinner', spin: true, className: 'inProgressIcon' },
	done: { icon: 'check', spin: false, className: 'doneIcon' },
	failed: { icon: 'x-circle', spin: false, className: 'failedIcon' },
	cancelled: { icon: 'ban', spin: false, className: 'cancelledIcon' },
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

const hasArtifacts = computed(() => tasks.value !== null || workflowArtifacts.value.length > 0);

const expandedCards = ref<Set<string>>(new Set());

function toggleCard(key: string) {
	if (expandedCards.value.has(key)) {
		expandedCards.value.delete(key);
	} else {
		expandedCards.value.add(key);
	}
}

// Auto-expand tasks card when it first appears
watch(tasks, (newTasks, oldTasks) => {
	if (newTasks && !oldTasks) {
		expandedCards.value.add('tasks');
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
			<!-- Tasks card -->
			<div v-if="tasks" :class="$style.artifactCard" @click="toggleCard('tasks')">
				<div :class="$style.cardHeader">
					<N8nIcon
						:icon="expandedCards.has('tasks') ? 'chevron-down' : 'chevron-right'"
						:class="$style.chevron"
						size="small"
					/>
					<N8nIcon icon="list-checks" size="small" />
					<span :class="$style.artifactName">{{
						i18n.baseText('instanceAi.artifactsPanel.tasks')
					}}</span>
					<span :class="$style.progress"> {{ doneCount }}/{{ tasks.tasks.length }} </span>
				</div>
				<div v-if="expandedCards.has('tasks')" :class="$style.expandedContent">
					<div :class="$style.taskList">
						<div
							v-for="task in tasks.tasks"
							:key="task.id"
							:class="[
								$style.task,
								task.status === 'done' ? $style.doneTask : '',
								task.status === 'failed' ? $style.failedTask : '',
								task.status === 'cancelled' ? $style.cancelledTask : '',
							]"
						>
							<N8nIcon
								:icon="statusIconMap[task.status].icon as IconName"
								:class="$style[statusIconMap[task.status].className]"
								:spin="statusIconMap[task.status].spin"
								size="small"
							/>
							<span :class="$style.taskDescription">{{ task.description }}</span>
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
	overflow: hidden;
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
	min-height: 0;
	overflow-y: auto;
}

.artifactCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	cursor: pointer;
	flex-shrink: 0;
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

.progress {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
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
	max-height: 300px;
	overflow-y: auto;
}

.previewContainer {
	height: 120px;
	border-radius: var(--radius);
	overflow: hidden;
	margin-top: var(--spacing--4xs);
}

/* Task list styles */
.taskList {
	padding: var(--spacing--2xs) 0;
}

.task {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	& + & {
		border-top: 1px solid var(--color--foreground--tint-2);
	}
}

.doneTask {
	opacity: 0.6;
}

.failedTask {
	color: var(--color--danger);
}

.cancelledTask {
	opacity: 0.7;
}

.taskDescription {
	color: var(--color--text);
	flex: 1;
	min-width: 0;
}

.todoIcon {
	color: var(--color--text--tint-1);
}

.inProgressIcon {
	color: var(--color--primary);
}

.doneIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
}

.cancelledIcon {
	color: var(--color--text--tint-1);
}

.emptyState {
	padding: var(--spacing--lg) var(--spacing--sm);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
