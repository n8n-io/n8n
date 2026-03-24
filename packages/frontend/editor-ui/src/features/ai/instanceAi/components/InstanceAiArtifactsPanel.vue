<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import type { TaskItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { ResourceEntry } from '../useResourceRegistry';
import TimeAgo from '@/app/components/TimeAgo.vue';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();

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
};

// --- Artifacts ---
const artifacts = computed((): ResourceEntry[] => {
	const result: ResourceEntry[] = [];
	for (const entry of store.resourceRegistry.values()) {
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

// --- Collapsible sections ---
const expandedSections = ref<Set<string>>(new Set(['tasks', 'artifacts']));

function toggleSection(key: string) {
	if (expandedSections.value.has(key)) {
		expandedSections.value.delete(key);
	} else {
		expandedSections.value.add(key);
	}
}

// Auto-expand tasks section when it first appears
watch(tasks, (newTasks, oldTasks) => {
	if (newTasks && !oldTasks) {
		expandedSections.value.add('tasks');
	}
});
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div :class="$style.body">
			<!-- Artifacts section -->
			<div :class="$style.section">
				<div :class="$style.sectionHeader" @click="toggleSection('artifacts')">
					<span :class="$style.sectionTitle">
						{{ i18n.baseText('instanceAi.artifactsPanel.title') }}
					</span>
					<N8nIcon
						:icon="expandedSections.has('artifacts') ? 'chevron-down' : 'chevron-right'"
						size="small"
						:class="$style.chevron"
					/>
				</div>

				<div v-if="expandedSections.has('artifacts')" :class="$style.sectionContent">
					<div v-if="artifacts.length > 0" :class="$style.artifactList">
						<div v-for="artifact in artifacts" :key="artifact.id" :class="$style.artifactRow">
							<N8nIcon
								:icon="artifactIconMap[artifact.type] ?? 'file'"
								size="small"
								:class="$style.artifactIcon"
							/>
							<div :class="$style.artifactInfo">
								<span :class="$style.artifactName">{{ artifact.name }}</span>
								<TimeAgo
									v-if="artifact.updatedAt ?? artifact.createdAt"
									:date="(artifact.updatedAt ?? artifact.createdAt)!"
									:class="$style.artifactDate"
								/>
							</div>
						</div>
					</div>

					<div v-else :class="$style.emptyState">
						<div :class="$style.emptyIcons">
							<N8nIcon icon="workflow" size="medium" :class="$style.emptyIcon" />
							<N8nIcon icon="table" size="medium" :class="$style.emptyIcon" />
						</div>
						<span>{{ i18n.baseText('instanceAi.artifactsPanel.noArtifacts') }}</span>
					</div>
				</div>
			</div>

			<!-- Tasks section -->
			<div v-if="tasks" :class="$style.section">
				<div :class="$style.sectionHeader" @click="toggleSection('tasks')">
					<span :class="$style.sectionTitle">
						{{ i18n.baseText('instanceAi.artifactsPanel.tasks') }}
					</span>
					<span :class="$style.progress">{{ doneCount }}/{{ tasks.tasks.length }}</span>
					<N8nIcon
						:icon="expandedSections.has('tasks') ? 'chevron-down' : 'chevron-right'"
						size="small"
						:class="$style.chevron"
					/>
				</div>

				<div v-if="expandedSections.has('tasks')" :class="$style.sectionContent">
					<div :class="$style.taskList">
						<div
							v-for="task in tasks.tasks"
							:key="task.id"
							:class="[$style.task, task.status === 'done' ? $style.doneTask : '']"
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
	justify-content: flex-end;
	padding: var(--spacing--2xs) var(--spacing--sm);
	flex-shrink: 0;
}

.body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	cursor: pointer;
	user-select: none;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.sectionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	flex: 1;
}

.chevron {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.progress {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.sectionContent {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--sm);
}

/* Artifact list */
.artifactList {
	display: flex;
	flex-direction: column;
}

.artifactRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;

	& + & {
		border-top: 1px solid var(--color--foreground--tint-2);
	}
}

.artifactIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.artifactInfo {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.artifactName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.artifactDate {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
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
	color: var(--color--text--tint-2);
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius);
}

/* Task list */
.taskList {
	display: flex;
	flex-direction: column;
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
</style>
