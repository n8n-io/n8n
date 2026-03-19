<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiTaskKind, InstanceAiTaskRun, InstanceAiTaskStatus } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

import { useInstanceAiStore } from '../instanceAi.store';

const emit = defineEmits<{ close: [] }>();

const store = useInstanceAiStore();
const i18n = useI18n();

const activeStatuses = new Set<InstanceAiTaskStatus>(['queued', 'running', 'suspended']);

const activeTasks = computed(() =>
	store.currentTaskRuns.filter((taskRun) => activeStatuses.has(taskRun.status)),
);

const recentTasks = computed(() =>
	store.currentTaskRuns.filter((taskRun) => !activeStatuses.has(taskRun.status)).slice(0, 12),
);

function getTaskKindLabel(kind: InstanceAiTaskKind): string {
	return i18n.baseText(`instanceAi.tasksPanel.kind.${kind}`);
}

function getTaskStatusLabel(status: InstanceAiTaskStatus): string {
	return i18n.baseText(`instanceAi.tasksPanel.status.${status}`);
}

function getTaskStatusClass(status: InstanceAiTaskStatus): string {
	if (status === 'completed') return 'statusCompleted';
	if (status === 'failed' || status === 'cancelled') return 'statusFailed';
	if (status === 'suspended') return 'statusSuspended';
	return 'statusRunning';
}

function getTaskIcon(status: InstanceAiTaskStatus): IconName {
	if (status === 'completed') return 'check';
	if (status === 'failed' || status === 'cancelled') return 'triangle-alert';
	if (status === 'suspended') return 'pause';
	return 'spinner';
}

function getTaskPhaseTitle(taskRun: InstanceAiTaskRun): string | null {
	if (!taskRun.planId || !taskRun.phaseId) return null;
	if (store.currentPlan?.planId !== taskRun.planId) return null;

	return store.currentPlan.phases.find((phase) => phase.id === taskRun.phaseId)?.title ?? null;
}

function formatTimestamp(timestamp: number | undefined): string | null {
	if (!timestamp) return null;
	return new Date(timestamp).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function cancelTask(taskId: string): void {
	void store.cancelBackgroundTask(taskId);
}
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="list" size="small" />
				<span>{{ i18n.baseText('instanceAi.tasksPanel.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div :class="$style.body">
			<section v-if="activeTasks.length > 0" :class="$style.section">
				<div :class="$style.sectionHeader">
					<span>{{ i18n.baseText('instanceAi.tasksPanel.section.active') }}</span>
					<span :class="$style.sectionCount">{{ activeTasks.length }}</span>
				</div>

				<div :class="$style.taskList">
					<div v-for="task in activeTasks" :key="task.taskId" :class="$style.taskCard">
						<div :class="$style.taskHeader">
							<div :class="$style.taskTitleRow">
								<N8nIcon
									:icon="getTaskIcon(task.status)"
									:spin="task.status === 'running' || task.status === 'queued'"
									size="small"
									:class="$style[getTaskStatusClass(task.status)]"
								/>
								<span :class="$style.taskTitle">{{ task.title }}</span>
								<span :class="$style.kindBadge">{{ getTaskKindLabel(task.kind) }}</span>
							</div>

							<button
								v-if="task.status === 'running' || task.status === 'queued'"
								:class="$style.cancelButton"
								type="button"
								@click="cancelTask(task.taskId)"
							>
								{{ i18n.baseText('generic.cancel') }}
							</button>
						</div>

						<div :class="$style.metaRow">
							<span :class="[$style.statusBadge, $style[getTaskStatusClass(task.status)]]">
								{{ getTaskStatusLabel(task.status) }}
							</span>
							<span v-if="getTaskPhaseTitle(task)" :class="$style.metaText">
								{{ i18n.baseText('instanceAi.tasksPanel.phase') }}: {{ getTaskPhaseTitle(task) }}
							</span>
							<span v-if="formatTimestamp(task.updatedAt)" :class="$style.metaText">
								{{ formatTimestamp(task.updatedAt) }}
							</span>
						</div>

						<p v-if="task.subtitle" :class="$style.subtitle">{{ task.subtitle }}</p>
						<p v-if="task.goal" :class="$style.goal">{{ task.goal }}</p>
					</div>
				</div>
			</section>

			<section v-if="recentTasks.length > 0" :class="$style.section">
				<div :class="$style.sectionHeader">
					<span>{{ i18n.baseText('instanceAi.tasksPanel.section.recent') }}</span>
					<span :class="$style.sectionCount">{{ recentTasks.length }}</span>
				</div>

				<div :class="$style.taskList">
					<div v-for="task in recentTasks" :key="task.taskId" :class="$style.taskCard">
						<div :class="$style.taskHeader">
							<div :class="$style.taskTitleRow">
								<N8nIcon
									:icon="getTaskIcon(task.status)"
									:spin="false"
									size="small"
									:class="$style[getTaskStatusClass(task.status)]"
								/>
								<span :class="$style.taskTitle">{{ task.title }}</span>
								<span :class="$style.kindBadge">{{ getTaskKindLabel(task.kind) }}</span>
							</div>
						</div>

						<div :class="$style.metaRow">
							<span :class="[$style.statusBadge, $style[getTaskStatusClass(task.status)]]">
								{{ getTaskStatusLabel(task.status) }}
							</span>
							<span v-if="getTaskPhaseTitle(task)" :class="$style.metaText">
								{{ i18n.baseText('instanceAi.tasksPanel.phase') }}: {{ getTaskPhaseTitle(task) }}
							</span>
							<span
								v-if="formatTimestamp(task.completedAt ?? task.updatedAt)"
								:class="$style.metaText"
							>
								{{ formatTimestamp(task.completedAt ?? task.updatedAt) }}
							</span>
						</div>

						<p v-if="task.resultSummary" :class="$style.summary">{{ task.resultSummary }}</p>
						<p v-else-if="task.error" :class="$style.error">{{ task.error }}</p>
						<p v-else-if="task.subtitle" :class="$style.subtitle">{{ task.subtitle }}</p>
					</div>
				</div>
			</section>

			<div v-if="store.currentTaskRuns.length === 0" :class="$style.emptyState">
				{{ i18n.baseText('instanceAi.tasksPanel.empty') }}
			</div>
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

.body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.sectionCount {
	font-variant-numeric: tabular-nums;
}

.taskList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.taskCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	background: var(--color--background);
}

.taskHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.taskTitleRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.taskTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.kindBadge {
	font-size: var(--font-size--3xs);
	padding: 1px var(--spacing--3xs);
	border-radius: var(--radius--sm);
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.cancelButton {
	border: none;
	background: transparent;
	color: var(--color--danger);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	padding: 0;
}

.metaRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.statusBadge {
	font-size: var(--font-size--3xs);
	padding: 1px var(--spacing--3xs);
	border-radius: var(--radius--sm);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	font-weight: var(--font-weight--bold);
}

.metaText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.subtitle,
.goal,
.summary,
.error {
	margin: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
}

.summary {
	color: var(--color--text);
}

.error {
	color: var(--color--danger);
}

.statusRunning {
	color: var(--color--primary);
}

.statusSuspended {
	color: var(--color--warning);
}

.statusCompleted {
	color: var(--color--success);
}

.statusFailed {
	color: var(--color--danger);
}

.emptyState {
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}
</style>
