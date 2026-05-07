<script lang="ts" setup>
import { computed, inject } from 'vue';
import {
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import type { TaskItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { ResourceEntry } from '../useResourceRegistry';
import ConnectionsCard from './ConnectionsCard.vue';

const props = withDefaults(defineProps<{ isPinned?: boolean }>(), {
	isPinned: true,
});

const emit = defineEmits<{ togglePinned: [] }>();

const i18n = useI18n();
const store = useInstanceAiStore();
const openPreview = inject<((id: string) => void) | undefined>('openWorkflowPreview', undefined);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);

function handleArtifactClick(artifact: ResourceEntry, e: MouseEvent) {
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

	if (artifact.type === 'workflow' && artifact.id) {
		if (!openPreview) return;
		e.preventDefault();
		openPreview(artifact.id);
	} else if (artifact.type === 'data-table' && artifact.id) {
		if (!artifact.projectId || !openDataTablePreview) return;
		e.preventDefault();
		openDataTablePreview(artifact.id, artifact.projectId);
	}
}

// --- Tasks ---
const tasks = computed(() => store.currentTasks);

const statusIconMap: Record<
	TaskItem['status'],
	{ icon: IconName; spin: boolean; className: string }
> = {
	todo: { icon: 'circle', spin: false, className: 'todoIcon' },
	in_progress: { icon: 'spinner', spin: true, className: 'inProgressIcon' },
	done: { icon: 'check', spin: false, className: 'doneIcon' },
	failed: { icon: 'circle-x', spin: false, className: 'failedIcon' },
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

function artifactHref(artifact: ResourceEntry) {
	if (artifact.type === 'workflow') return `/workflow/${artifact.id}`;
	if (artifact.type === 'data-table') {
		return artifact.projectId
			? `/projects/${artifact.projectId}/datatables/${artifact.id}`
			: '/data-tables';
	}
	return '#';
}

function openArtifactLabel(name: string) {
	return i18n.baseText('instanceAi.artifactsPanel.openArtifact', { interpolate: { name } });
}

const pinButtonLabel = computed(() =>
	i18n.baseText(
		props.isPinned ? 'instanceAi.artifactsPanel.unpinPanel' : 'instanceAi.artifactsPanel.pinPanel',
	),
);
</script>

<template>
	<aside :class="$style.panel" data-test-id="instance-ai-artifacts-sidebar">
		<div :class="$style.group" data-test-id="instance-ai-artifacts-sidebar-group">
			<!-- Artifacts section -->
			<div :class="$style.section">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h3" size="small" bold>
						{{ i18n.baseText('instanceAi.artifactsPanel.title') }}
					</N8nHeading>
					<N8nTooltip :content="pinButtonLabel" placement="left" :show-after="TOOLTIP_DELAY_MS">
						<N8nIconButton
							icon="pin"
							variant="ghost"
							size="small"
							icon-size="medium"
							:aria-label="pinButtonLabel"
							:aria-pressed="props.isPinned"
							:class="[$style.pinButton, { [$style.pinButtonPinned]: props.isPinned }]"
							data-test-id="instance-ai-artifacts-sidebar-pin"
							@click="emit('togglePinned')"
						/>
					</N8nTooltip>
				</div>

				<div v-if="artifacts.length > 0" :class="$style.artifactList">
					<a
						v-for="artifact in artifacts"
						:key="artifact.id"
						:href="artifactHref(artifact)"
						:class="[$style.artifactRow, artifact.archived && $style.artifactRowArchived]"
						:title="artifact.name"
						:aria-label="openArtifactLabel(artifact.name)"
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
						<span v-if="artifact.archived" :class="$style.archivedBadge">
							{{ i18n.baseText('instanceAi.artifactsPanel.archived') }}
						</span>
					</a>
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
			<div :class="$style.section">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h3" size="small" bold>
						{{ i18n.baseText('instanceAi.artifactsPanel.tasks') }}
					</N8nHeading>
				</div>

				<div v-if="tasks" :class="$style.taskList">
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
							:icon="statusIconMap[task.status].icon"
							:class="$style[statusIconMap[task.status].className]"
							:spin="statusIconMap[task.status].spin"
							size="medium"
						/>
						<span :class="$style.taskDescription" :title="task.description">{{
							task.description
						}}</span>
					</div>
				</div>
				<div v-else :class="$style.emptyState">
					<N8nIcon icon="list-checks" :size="30" :class="$style.emptyIcon" />
					<span>{{ i18n.baseText('instanceAi.artifactsPanel.noTasks') }}</span>
				</div>
			</div>

			<!-- Connections section -->
			<ConnectionsCard />
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
	overflow-y: auto;
}

.group {
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
	overflow: hidden;
}

.section {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.sectionHeader {
	margin-bottom: var(--spacing--2xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
}

.pinButton {
	color: var(--color--text--tint-1);

	&:hover,
	&:focus-visible {
		color: var(--color--text--shade-1);
	}
}

.pinButtonPinned {
	color: var(--color--text--shade-1);
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
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);
	color: var(--color--text);
	text-decoration: none;
	transition:
		background-color var(--animation--duration--snappy) var(--animation--easing),
		color var(--animation--duration--snappy) var(--animation--easing);

	&:hover,
	&:focus-visible {
		background: var(--color--foreground--tint-2);
		outline: none;
		text-decoration: none;

		.artifactName {
			color: var(--color--primary);
		}

		.artifactIcon {
			color: var(--color--primary);
		}
	}

	&:visited {
		color: var(--color--text);
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
	flex: 1;
	min-width: 0;
}

.artifactRowArchived {
	opacity: 0.55;

	.artifactName {
		text-decoration: line-through;
	}
}

.archivedBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	flex-shrink: 0;
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
