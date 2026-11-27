<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { parseAgentSkillWorkflowMentions, type SkillWorkflowMention } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { VIEWS } from '@/app/constants';
import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import type { AgentSkill } from '@/features/agents/types';
import { useSkillWorkflowNoteData } from '@/features/agents/composables/useSkillWorkflowNoteData';
import {
	AGENT_BLOCKING_NOTES,
	getSkillWorkflowNotes,
	type SkillWorkflowNote,
} from '@/features/agents/utils/skillWorkflowNotes';
import SkillWorkflowMentionPicker from './SkillWorkflowMentionPicker.vue';
import SkillDiffCount from './skillVersions/SkillDiffCount.vue';
import type {
	FileChange,
	FileStatus,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

const SKILL_FILE = 'SKILL.md';
const statusLabels: Record<FileStatus, BaseTextKey> = {
	added: 'agents.builder.skills.versions.fileAdded',
	removed: 'agents.builder.skills.versions.fileDeleted',
	modified: 'agents.builder.skills.versions.fileModified',
};
const statusIcons = { added: 'file-plus', removed: 'file-minus', modified: 'file-diff' } as const;

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		selectedPath: string;
		addReferenceDisabled?: boolean;
		readOnly?: boolean;
		/** Reference files that block a save, marked so the user can find them. */
		invalidPaths?: string[];
		/** Compare mode: lines added and removed in each file, keyed by path. */
		changeCounts?: Record<string, FileChange>;
		mentionProjectId?: string;
		mentionProjectName?: string;
		instanceSkill?: boolean;
		availableToMcp?: boolean;
		outsideProjectWorkflowIds?: string[];
		agentContext?: boolean;
	}>(),
	{
		addReferenceDisabled: false,
		readOnly: false,
		invalidPaths: () => [],
		mentionProjectId: undefined,
		mentionProjectName: undefined,
		instanceSkill: false,
		availableToMcp: false,
		outsideProjectWorkflowIds: () => [],
		agentContext: false,
	},
);

const emit = defineEmits<{
	select: [path: string];
	'add-reference': [];
	'remove-reference': [path: string];
	'add-workflow': [mention: SkillWorkflowMention];
}>();

const i18n = useI18n();
const router = useRouter();
const posthog = usePostHog();
const references = computed(() =>
	(props.skill.references ?? []).map(({ path }) => ({ path, change: props.changeCounts?.[path] })),
);
const workflowMentionsEnabled = computed(() =>
	posthog.isVariantEnabled(
		WORKFLOWS_IN_SKILLS_EXPERIMENT.name,
		WORKFLOWS_IN_SKILLS_EXPERIMENT.variant,
	),
);
const addWorkflowOpen = ref(false);
const mentionedWorkflows = computed(() => parseAgentSkillWorkflowMentions(props.skill));
const mentionedWorkflowIds = computed(() =>
	mentionedWorkflows.value.map(({ workflowId }) => workflowId),
);
const { noteData } = useSkillWorkflowNoteData(mentionedWorkflowIds, workflowMentionsEnabled);
const NOTE_TEXT_KEYS: Record<SkillWorkflowNote, BaseTextKey> = {
	notFound: 'agents.builder.skills.workflowMentions.note.notFound',
	archived: 'agents.builder.skills.workflowMentions.note.archived',
	agentTrigger: 'agents.builder.skills.workflowMentions.note.agentTrigger',
	mcpTrigger: 'agents.builder.skills.workflowMentions.note.mcpTrigger',
	mcpUnavailable: 'agents.builder.skills.workflowMentions.note.mcpUnavailable',
	unpublished: 'agents.builder.skills.workflowMentions.note.unpublished',
	outsideProject: 'agents.builder.skills.workflowMentions.note.outsideProject',
	instanceAccess: 'agents.builder.skills.workflowMentions.note.instanceAccess',
};
const workflowRows = computed(() =>
	mentionedWorkflows.value.map((workflow) => {
		const data = noteData.value.get(workflow.workflowId);
		const allNotes =
			data === undefined
				? []
				: getSkillWorkflowNotes(data, {
						instanceSkill: props.instanceSkill,
						availableToMCP: props.availableToMcp,
						projectId: props.agentContext ? undefined : props.mentionProjectId,
					});
		const outsideProjectWarnings = props.outsideProjectWorkflowIds.includes(workflow.workflowId)
			? [
					i18n.baseText('agents.builder.validation.issue.tool.workflow.notInProject', {
						interpolate: { id: workflow.name || workflow.workflowId },
					}),
				]
			: [];
		const isWarning = (note: SkillWorkflowNote) =>
			props.agentContext && AGENT_BLOCKING_NOTES.includes(note);
		const isCoveredByWarning = (note: SkillWorkflowNote) =>
			note === 'instanceAccess' && outsideProjectWarnings.length > 0;
		const toText = (note: SkillWorkflowNote) => i18n.baseText(NOTE_TEXT_KEYS[note]);
		return {
			...workflow,
			warnings: [...outsideProjectWarnings, ...allNotes.filter(isWarning).map(toText)],
			notes: allNotes.filter((note) => !isWarning(note) && !isCoveredByWarning(note)).map(toText),
		};
	}),
);

function workflowUrl(workflowId: string) {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } }).href;
}

function isInvalid(path: string) {
	return props.invalidPaths.includes(path);
}

/** The name a screen reader reads for a reference row. The status icon itself is hidden from it. */
function referenceLabel(path: string) {
	const label = isInvalid(path)
		? i18n.baseText('agents.builder.skills.references.invalidLabel', { interpolate: { path } })
		: path;
	const status = props.changeCounts?.[path]?.status;
	if (!status) return label;
	return `${label}, ${i18n.baseText(statusLabels[status])}`;
}

function isSelected(path: string) {
	return props.selectedPath === path;
}

function testIdForPath(path: string) {
	return `agent-skill-reference-nav-item-${path.replace(/[^A-Za-z0-9_-]+/g, '-')}`;
}
</script>

<template>
	<nav
		:class="$style.nav"
		:aria-label="i18n.baseText('agents.builder.skills.filesNav.label')"
		data-testid="agent-skill-file-nav"
	>
		<button
			type="button"
			:class="[$style.item, isSelected(SKILL_FILE) && $style.selected]"
			:aria-current="isSelected(SKILL_FILE) ? 'page' : undefined"
			data-testid="agent-skill-file-nav-item"
			@click="emit('select', SKILL_FILE)"
		>
			<N8nIcon icon="file-text" :size="16" :class="$style.icon" />
			<N8nText size="medium" :class="$style.path">{{ SKILL_FILE }}</N8nText>
			<SkillDiffCount :count="props.changeCounts?.[SKILL_FILE]" :class="$style.count" />
		</button>

		<div :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nText size="small" color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('agents.builder.skills.references.title') }}
				</N8nText>
				<N8nButton
					v-if="!props.readOnly"
					:class="$style.addReference"
					variant="ghost"
					size="xsmall"
					icon-only
					icon="plus"
					:disabled="props.addReferenceDisabled"
					:aria-label="i18n.baseText('agents.builder.skills.references.add' as BaseTextKey)"
					data-testid="agent-skill-add-reference"
					@click="emit('add-reference')"
				/>
			</div>
			<N8nText
				v-if="references.length === 0"
				size="small"
				color="text-light"
				:class="$style.sectionTitle"
			>
				{{ i18n.baseText('agents.builder.skills.references.empty') }}
			</N8nText>
			<div
				v-for="reference in references"
				:key="reference.path"
				:class="[$style.referenceRow, isSelected(reference.path) && $style.selected]"
			>
				<button
					type="button"
					:class="[$style.item, $style.reference]"
					:aria-current="isSelected(reference.path) ? 'page' : undefined"
					:aria-label="referenceLabel(reference.path)"
					:data-testid="testIdForPath(reference.path)"
					@click="emit('select', reference.path)"
				>
					<N8nIcon
						:icon="isInvalid(reference.path) ? 'triangle-alert' : 'file-text'"
						:size="16"
						:class="[$style.icon, isInvalid(reference.path) && $style.invalidIcon]"
						:data-testid="
							isInvalid(reference.path) ? `${testIdForPath(reference.path)}-invalid` : undefined
						"
					/>
					<N8nText size="medium" :class="$style.path">{{ reference.path }}</N8nText>
					<span v-if="reference.change" :class="$style.count">
						<N8nIcon
							v-if="reference.change.status"
							:icon="statusIcons[reference.change.status]"
							size="small"
							:class="
								reference.change.status === 'added'
									? $style.fileAdded
									: reference.change.status === 'removed'
										? $style.fileDeleted
										: undefined
							"
							:data-testid="`${testIdForPath(reference.path)}-${reference.change.status}`"
						/>
						<SkillDiffCount :count="reference.change" :hide-zero="!!reference.change.status" />
					</span>
				</button>
				<N8nButton
					v-if="!props.readOnly"
					:class="$style.removeReference"
					variant="ghost"
					size="xsmall"
					icon-only
					icon="trash-2"
					:aria-label="i18n.baseText('agents.builder.skills.references.remove' as BaseTextKey)"
					:data-testid="`${testIdForPath(reference.path)}-remove`"
					@click="emit('remove-reference', reference.path)"
				/>
			</div>
		</div>

		<div v-if="workflowMentionsEnabled" :class="$style.section" data-testid="agent-skill-workflows">
			<div :class="$style.sectionHeader">
				<N8nText size="small" color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('agents.builder.skills.workflowMentions.title') }}
				</N8nText>
				<SkillWorkflowMentionPicker
					v-if="!props.readOnly"
					v-model:open="addWorkflowOpen"
					mode="button"
					:project-id="props.mentionProjectId"
					:project-name="props.mentionProjectName"
					:mentioned-workflow-ids="mentionedWorkflowIds"
					@select="emit('add-workflow', $event)"
				/>
			</div>
			<N8nText
				v-if="mentionedWorkflows.length === 0"
				size="small"
				color="text-light"
				:class="$style.sectionTitle"
			>
				{{ i18n.baseText('agents.builder.skills.workflowMentions.empty') }}
			</N8nText>
			<div
				v-for="workflow in workflowRows"
				:key="workflow.workflowId"
				:class="[$style.item, $style.workflow]"
				data-testid="agent-skill-workflow-item"
			>
				<a
					:href="workflowUrl(workflow.workflowId)"
					target="_blank"
					rel="noopener"
					:class="$style.workflowLink"
					data-testid="agent-skill-workflow-link"
					data-attr="agent-skill-workflow-link"
				>
					<N8nIcon icon="workflow" :size="16" :class="$style.icon" />
					<N8nText size="medium" :class="$style.path">{{
						workflow.name || workflow.workflowId
					}}</N8nText>
				</a>
				<N8nTooltip v-if="workflow.notes.length > 0" as-child placement="right">
					<template #content>
						<p v-for="note in workflow.notes" :key="note" :class="$style.note">
							{{ note }}
						</p>
					</template>
					<span
						:class="$style.noteIcon"
						tabindex="0"
						role="img"
						:aria-label="workflow.notes.join(' ')"
						data-testid="agent-skill-workflow-notes"
						data-attr="agent-skill-workflow-notes"
					>
						<N8nIcon icon="info" :size="16" />
					</span>
				</N8nTooltip>
				<N8nTooltip v-if="workflow.warnings.length > 0" as-child placement="right">
					<template #content>
						<p v-for="warning in workflow.warnings" :key="warning" :class="$style.note">
							{{ warning }}
						</p>
					</template>
					<span
						:class="[$style.noteIcon, $style.invalidIcon]"
						tabindex="0"
						role="img"
						:aria-label="workflow.warnings.join(' ')"
						data-testid="agent-skill-workflow-warnings"
						data-attr="agent-skill-workflow-warnings"
					>
						<N8nIcon icon="triangle-alert" :size="16" />
					</span>
				</N8nTooltip>
			</div>
		</div>
	</nav>
</template>

<style module lang="scss">
.nav {
	width: 240px;
	box-sizing: border-box;
	flex-shrink: 0;
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	background: var(--color--background--light);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
	border: none;
	background: transparent;
	border-radius: var(--border-radius-base);
	color: var(--color--text);
	padding: var(--spacing--2xs);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}

.icon {
	flex-shrink: 0;
}

.referenceRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	min-width: 0;
	border-radius: var(--border-radius-base);

	.removeReference {
		opacity: 0;
	}

	&:hover,
	&:focus-within {
		background: var(--background--hover);

		.removeReference {
			opacity: 1;
		}
	}
}

.reference {
	flex: 1;
	padding-left: var(--spacing--xs);

	&:hover {
		background: transparent;
	}
}

.sectionTitle {
	padding-inline: var(--spacing--2xs);
}

.addReference {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
}

.removeReference {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	margin-left: auto;
	margin-right: var(--spacing--2xs);
	flex-shrink: 0;
}

.workflow {
	cursor: default;

	&:hover {
		background: transparent;
	}
}

.workflowLink {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	color: inherit;
	text-decoration: none;

	&:hover .path {
		text-decoration: underline;
	}
}

.noteIcon {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--text-color--subtler);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		border-radius: var(--radius--3xs);
	}
}

.note {
	margin: 0;

	& + & {
		margin-top: var(--spacing--2xs);
	}
}

.invalidIcon {
	color: var(--color--danger);
}

/* A translucent overlay, so the selected file stands out on a grey or a white list. A hover
   keeps it, so the selected file does not go lighter under the pointer. */
.selected,
.selected:hover,
.selected:focus-within {
	background: var(--background--active);
}

.path {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (max-width: 480px) {
	.nav {
		width: 100%;
		max-height: calc(var(--height--5xl) * 2);
		border-right: 0;
		border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
		overflow-y: auto;
	}
}
.count {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
}

.fileAdded {
	color: var(--diff--color--new);
}

.fileDeleted {
	color: var(--diff--color--deleted);
}
</style>
