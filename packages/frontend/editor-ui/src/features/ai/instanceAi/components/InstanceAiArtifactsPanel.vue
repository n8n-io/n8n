<script lang="ts" setup>
import { computed, inject } from 'vue';
import { N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import type { TaskItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { ResourceEntry } from '../useResourceRegistry';

const i18n = useI18n();
const store = useInstanceAiStore();
const openPreview = inject<((id: string) => void) | undefined>('openWorkflowPreview', undefined);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);

function handleArtifactClick(artifact: ResourceEntry, e: MouseEvent) {
	if (artifact.type === 'workflow' && artifact.id) {
		if (e.metaKey || e.ctrlKey) {
			window.open(`/workflow/${artifact.id}`, '_blank');
			return;
		}
		openPreview?.(artifact.id);
	} else if (artifact.type === 'data-table' && artifact.id) {
		if (e.metaKey || e.ctrlKey) {
			window.open('/data-tables', '_blank');
			return;
		}
		if (artifact.projectId) {
			openDataTablePreview?.(artifact.id, artifact.projectId);
		}
	}
}

// --- Tasks ---
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

// --- Artifacts ---
const artifacts = computed((): ResourceEntry[] => {
	const result: ResourceEntry[] = [];
	for (const entry of store.producedArtifacts.values()) {
		if (entry.type === 'workflow' || entry.type === 'data-table') {
			result.push(entry);
		}
	}
	return result;
});

const artifactIconMap: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
};
</script>

<template>
	<div :class="$style.panel">
		<!-- Artifacts section -->
		<div :class="[$style.section, $style.card]">
			<N8nHeading :class="$style.sectionTitle" tag="h3" size="small" bold>
				{{ i18n.baseText('instanceAi.artifactsPanel.title') }}
			</N8nHeading>

			<div v-if="artifacts.length > 0" :class="$style.artifactList">
				<div
					v-for="artifact in artifacts"
					:key="artifact.id"
					:class="$style.artifactRow"
					@click="handleArtifactClick(artifact, $event)"
				>
					<span :class="$style.artifactIconWrap">
						<N8nIcon
							:icon="artifactIconMap[artifact.type] ?? 'file'"
							size="large"
							:class="$style.artifactIcon"
						/>
					</span>
					<span :class="$style.artifactName">{{ artifact.name }}</span>
				</div>
			</div>

			<div v-else :class="$style.emptyState">
				<div :class="$style.emptyIcons">
					<N8nIcon icon="workflow" :size="30" :class="$style.emptyIcon" />
					<N8nIcon icon="table" :size="30" :class="$style.emptyIcon" />
				</div>
				<span>{{ i18n.baseText('instanceAi.artifactsPanel.noArtifacts') }}</span>
			</div>
		</div>

		<!-- Tasks section -->
		<div v-if="tasks" :class="[$style.section, $style.card]">
			<N8nHeading :class="$style.sectionTitle" tag="h3" size="small" bold>
				{{ i18n.baseText('instanceAi.artifactsPanel.tasks') }}
				<span :class="$style.progress">{{ doneCount }}/{{ tasks.tasks.length }}</span>
			</N8nHeading>

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
						size="medium"
					/>
					<span :class="$style.taskDescription" :title="task.description">{{
						task.description
					}}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.section {
	display: flex;
	flex-direction: column;
}

.card {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	background: var(--color--background--light-2);
}

.sectionTitle {
	margin-bottom: var(--spacing--2xs);
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}

.progress {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
}

/* Artifact list */
.artifactList {
	display: flex;
	flex-direction: column;
}

.artifactRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.2s ease;

	&:hover {
		background: var(--color--foreground--tint-2);

		.artifactName {
			color: var(--color--primary);
		}

		.artifactIcon {
			color: var(--color--primary);
		}
	}
}

.artifactIconWrap {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius);
	flex-shrink: 0;
}

.artifactIcon {
	color: var(--color--text);
}

.artifactName {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Empty state */
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.emptyIcons {
	display: flex;
	gap: var(--spacing--2xs);
}

.emptyIcon {
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
}

/* Task list */
.taskList {
	display: flex;
	flex-direction: column;
}

.task {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.doneTask {
	opacity: 0.6;
	text-decoration: line-through;
}

.failedTask {
	color: var(--color--danger);
}

.cancelledTask {
	opacity: 0.7;
}

.taskDescription {
	color: var(--color--text--shade-1);
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.todoIcon {
	color: var(--color--text--tint-2);
}

.inProgressIcon {
	color: var(--color--primary);
}

.doneIcon {
	color: white;
	background: var(--color--success);
	border-radius: 50%;
	padding: 1px;
}

.failedIcon {
	color: var(--color--danger);
}

.cancelledIcon {
	color: var(--color--text--tint-1);
}
</style>
