<script lang="ts" setup>
import type { InstanceAiHandoffContext, TaskItem } from '@n8n/api-types';
import { isIconOrEmoji, N8nIcon, N8nLoading, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, type Ref } from 'vue';
import { useBuildingArtifactIds } from '../composables/useBuildingArtifactIds';
import { useArtifactThread } from '../artifactThread';
import { useInstanceAiStore } from '../instanceAi.store';
import type { ResourceEntry } from '../useResourceRegistry';
import InstanceAiPanelList from './InstanceAiPanelList.vue';
import InstanceAiPanelListItem from './InstanceAiPanelListItem.vue';
import { useArtifactLinks } from '../artifactLinks';
import {
	agentPreviewContextIcon,
	formatAgentPreviewContextLabel,
	getDismissedContextKeys,
	handoffContextKey,
} from '../instanceAi.handoffContext';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const projectsStore = useProjectsStore();
const store = useInstanceAiStore();

const i18n = useI18n();
const { artifactHref: resolveArtifactHref } = useArtifactLinks();
const thread = useArtifactThread();
const project = computed(() => {
	// The project id arrives with thread hydration. Until then the lookup is
	// pending, not unknown, so the template shows a skeleton instead.
	if (!thread.projectId && thread.hydrationStatus !== 'ready') return undefined;
	const match = projectsStore.myProjects.find((p) => p.id === thread.projectId);
	if (!match)
		return {
			name: i18n.baseText('instanceAi.artifactsPanel.unknownProject'),
			icon: { type: 'icon' as const, value: 'circle-help' as const },
		};
	const isPersonal = match.type === 'personal';
	const icon = isIconOrEmoji(match.icon)
		? match.icon
		: { type: 'icon' as const, value: 'layers' as const };
	return {
		name: isPersonal ? i18n.baseText('instanceAi.artifactsPanel.personalSpace') : match.name,
		icon: isPersonal ? { type: 'icon' as const, value: 'user' as const } : icon,
	};
});
const openPreview = inject<((id: string) => void) | undefined>('openWorkflowPreview', undefined);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);
const openAgentPreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openAgentPreview',
	undefined,
);
const openSkillPreview = inject<((id: string) => void) | undefined>('openSkillPreview', undefined);
const openAppPreview = inject<((id: string) => void) | undefined>('openAppPreview', undefined);
const pendingComposerContext = inject<Readonly<Ref<InstanceAiHandoffContext | null>> | undefined>(
	'pendingComposerContext',
	undefined,
);
const dismissPendingComposerContext = inject<((key: string) => boolean) | undefined>(
	'dismissPendingComposerContext',
	undefined,
);

interface ContextEntry {
	key: string;
	icon: string;
	name: string;
	subtitle: string;
}

function handleArtifactClick(artifact: ResourceEntry, e: MouseEvent) {
	if (artifact.type === 'agent' && artifact.pending) e.preventDefault();
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

	if (artifact.type === 'workflow' && artifact.id) {
		if (!openPreview) return;
		e.preventDefault();
		openPreview(artifact.id);
	} else if (artifact.type === 'data-table' && artifact.id) {
		if (!artifact.projectId || !openDataTablePreview) return;
		e.preventDefault();
		openDataTablePreview(artifact.id, artifact.projectId);
	} else if (artifact.type === 'agent' && artifact.id) {
		if (!artifact.projectId || !openAgentPreview) return;
		e.preventDefault();
		openAgentPreview(artifact.id, artifact.projectId);
	} else if (artifact.type === 'skill' && artifact.id) {
		if (!openSkillPreview) return;
		// Always prevent: this row has no target="_blank", so the browser would
		// navigate the chat tab away even when the skill tab is already active.
		e.preventDefault();
		openSkillPreview(artifact.id);
	} else if (artifact.type === 'app' && artifact.id) {
		if (!openAppPreview) return;
		e.preventDefault();
		openAppPreview(artifact.id);
	}
}

// --- Tasks ---
const tasks = computed(() => thread.currentTasks);
const visibleTasks = computed(() => tasks.value?.tasks ?? []);
const hasTasks = computed(() => visibleTasks.value.length > 0);

const statusIconMap: Record<TaskItem['status'], { icon: IconName; spin: boolean }> = {
	todo: { icon: 'circle', spin: false },
	in_progress: { icon: 'spinner', spin: true },
	done: { icon: 'check', spin: false },
	failed: { icon: 'circle-x', spin: false },
	cancelled: { icon: 'ban', spin: false },
};

// --- Artifacts ---
const buildingArtifactIds = useBuildingArtifactIds();

const artifacts = computed((): ResourceEntry[] => {
	const result: ResourceEntry[] = [];
	for (const entry of thread.producedArtifacts.values()) {
		if (
			entry.type === 'workflow' ||
			entry.type === 'data-table' ||
			entry.type === 'agent' ||
			entry.type === 'skill' ||
			entry.type === 'app'
		) {
			result.push(entry);
		}
	}
	return result;
});

const artifactIconMap: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
	agent: 'robot',
	skill: 'book-open',
	app: 'layout-template',
};

function artifactHref(artifact: ResourceEntry) {
	if (artifact.type === 'agent' && artifact.pending) return '#';
	return resolveArtifactHref(artifact.type, artifact.id, artifact.projectId) ?? '#';
}

function openArtifactLabel(name: string) {
	return i18n.baseText('instanceAi.artifactsPanel.openArtifact', { interpolate: { name } });
}

function contextEntryFor(context: InstanceAiHandoffContext): ContextEntry | undefined {
	const key = handoffContextKey(context);

	// A control signal, not user-added context — no sidebar entry.
	if (context.source === 'setup-panel-execute') return undefined;
	// The workflow attachment already shows the workflow the finding is about.
	if (context.source === 'migration-report') return undefined;

	if (context.source === 'agent-preview') {
		return {
			key,
			icon: agentPreviewContextIcon(context.agentIcon),
			name: formatAgentPreviewContextLabel(
				context,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(context.agentId)?.name,
			),
			subtitle: i18n.baseText('instanceAi.artifactsPanel.context.addedToContext'),
		};
	}

	return {
		key,
		icon: 'key-round',
		name: context.credential.displayName,
		subtitle: i18n.baseText('instanceAi.artifactsPanel.context.credentialModal'),
	};
}

const contextEntries = computed<ContextEntry[]>(() => {
	const entries: ContextEntry[] = [];
	const seen = new Set<string>();
	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));

	// Pending handoff (preview "Send to Assistant") lives on the composer until
	// the first send — include it so the sidebar matches the input chip.
	const pending = pendingComposerContext?.value;
	const pendingEntry = pending ? contextEntryFor(pending) : undefined;
	if (pendingEntry) {
		seen.add(pendingEntry.key);
		entries.push(pendingEntry);
	}

	for (const turn of [...thread.artifactTurns].reverse()) {
		if (turn.role !== 'user' || !turn.context) continue;

		const key = handoffContextKey(turn.context);
		if (seen.has(key) || dismissedKeys.has(key)) continue;
		const entry = contextEntryFor(turn.context);
		if (!entry) continue;
		seen.add(key);
		entries.push(entry);
	}

	return entries;
});

async function dismissContext(key: string) {
	const pending = pendingComposerContext?.value;
	if (pending && handoffContextKey(pending) === key) {
		dismissPendingComposerContext?.(key);
		return;
	}
	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	dismissedKeys.add(key);
	await store.updateThreadMetadata(thread.id, {
		dismissedContextKeys: [...dismissedKeys],
	});
}
</script>

<template>
	<aside :class="$style.panel" data-test-id="instance-ai-artifacts-sidebar">
		<div :class="$style.group" data-test-id="instance-ai-artifacts-sidebar-group">
			<InstanceAiPanelList
				:title="i18n.baseText('instanceAi.artifactsPanel.project')"
				:collapsible="false"
			>
				<InstanceAiPanelListItem v-if="project" :label="project.name" :icon="project.icon" />
				<li v-else :class="$style.skeletonRow" data-test-id="instance-ai-artifacts-project-loading">
					<span :class="$style.iconSkeleton"><N8nLoading variant="custom" /></span>
					<span :class="$style.nameSkeleton"><N8nLoading variant="custom" /></span>
				</li>
			</InstanceAiPanelList>

			<hr v-if="contextEntries.length > 0" :class="$style.separator" />
			<InstanceAiPanelList
				v-if="contextEntries.length > 0"
				:count="contextEntries.length"
				:title="i18n.baseText('instanceAi.artifactsPanel.context.title')"
			>
				<InstanceAiPanelListItem
					v-for="entry in contextEntries"
					:key="entry.key"
					:label="entry.name"
					:subtitle="entry.subtitle"
					:icon="entry.icon"
					dismissible
					test-id="instance-ai-context-row"
					@dismiss="dismissContext(entry.key)"
				/>
			</InstanceAiPanelList>

			<hr :class="$style.separator" />
			<InstanceAiPanelList
				:title="i18n.baseText('instanceAi.artifactsPanel.title')"
				:count="artifacts.length"
			>
				<template v-if="artifacts.length === 0 && thread.hydrationStatus === 'ready'" #empty>
					{{ i18n.baseText('instanceAi.artifactsPanel.noArtifacts') }}
				</template>
				<InstanceAiPanelListItem
					v-for="artifact in artifacts"
					:key="artifact.id"
					:label="artifact.name"
					:icon="artifactIconMap[artifact.type] ?? 'file'"
					:href="artifactHref(artifact)"
					:aria-label="openArtifactLabel(artifact.name)"
					:archived="artifact.archived"
					@click="handleArtifactClick(artifact, $event)"
				>
					<template v-if="buildingArtifactIds.has(artifact.id)" #leading>
						<N8nIcon
							icon="spinner"
							spin
							size="large"
							data-test-id="instance-ai-artifact-building-spinner"
						/>
					</template>
				</InstanceAiPanelListItem>
				<li
					v-if="artifacts.length === 0 && thread.hydrationStatus !== 'ready'"
					:class="$style.skeletonRow"
					data-test-id="instance-ai-artifacts-list-loading"
				>
					<span :class="$style.iconSkeleton"><N8nLoading variant="custom" /></span>
					<span :class="$style.nameSkeleton"><N8nLoading variant="custom" /></span>
				</li>
			</InstanceAiPanelList>

			<hr v-if="hasTasks" :class="$style.separator" />
			<InstanceAiPanelList
				v-if="hasTasks"
				:count="visibleTasks.length"
				:title="i18n.baseText('instanceAi.artifactsPanel.tasks')"
			>
				<InstanceAiPanelListItem
					v-for="task in visibleTasks"
					:key="task.id"
					:label="task.description"
				>
					<template #leading>
						<N8nIcon
							:icon="statusIconMap[task.status].icon"
							:spin="statusIconMap[task.status].spin"
							size="large"
						/>
					</template>
				</InstanceAiPanelListItem>
			</InstanceAiPanelList>
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
	max-height: 100%;
}

.group {
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	box-shadow: var(--shadow--xs);
	overflow: hidden;
}

.separator {
	margin: 0;
	border: 0;
	border-top: var(--border);
	border-color: var(--border-color--subtle);
}

/* Skeleton rows match the footprint of InstanceAiPanelListItem: one text line plus the row padding */
.skeletonRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	min-height: calc(var(--font-size--sm) * var(--line-height--lg) + 2 * var(--spacing--2xs));
}

.iconSkeleton {
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}

.nameSkeleton {
	flex: 1;
	max-width: 50%;
	height: var(--font-size--sm);
}
</style>
