<script setup lang="ts">
import type { AgentConfigValidationIssue, AgentSkillVersionInfo } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentSkill } from '../types';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentSkillVersionBadge from './skillVersions/AgentSkillVersionBadge.vue';
import AgentSkillVersionDiffDialog from './skillVersions/AgentSkillVersionDiffDialog.vue';
import {
	skillVersionState,
	type SkillVersionRange,
	type SkillVersionState,
} from './skillVersions/skillVersionState';
import { useSkillVersionLoader } from './skillVersions/useSkillVersionLoader';

const props = withDefaults(
	defineProps<{
		/** In ref order. A skill has no on/off toggle: a ref is attached or it is not. */
		skills: Array<{ id: string; skill: AgentSkill }>;
		disabled?: boolean;
		showLabel?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		/** Fallback for agents without `skillVersions`, such as an older server. */
		outdatedSkillIds?: string[];
		/** Version state per hub skill. Without it the rows show no version badge. */
		skillVersions?: Record<string, AgentSkillVersionInfo>;
	}>(),
	{
		disabled: false,
		showLabel: true,
		validationIssues: () => [],
		outdatedSkillIds: () => [],
		skillVersions: undefined,
	},
);

const emit = defineEmits<{
	'open-skill': [id: string];
	'add-skill': [];
	'remove-skill': [id: string];
	/** Pins the skill ref to a version (`versionId`), or follows the latest version (null). */
	'set-skill-version': [id: string, versionId: string | null];
}>();

const i18n = useI18n();
const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);
const skillIssueMessages = computed(() =>
	groupIssueMessages('skill', (issue) => issue.capability.id),
);
const outdatedSkillIds = computed(() => new Set(props.outdatedSkillIds));
const outdatedWarning = computed(() => [i18n.baseText('agents.builder.skills.outdated.warning')]);
const versionLoader = useSkillVersionLoader();

type SkillRow = {
	id: string;
	skill: AgentSkill;
	info?: AgentSkillVersionInfo;
	state?: SkillVersionState;
	/** The old warning, only for skills the server sends no version state for. */
	outdated: boolean;
	invalidReasons: string[];
};

const rows = computed<SkillRow[]>(() =>
	props.skills.map(({ id, skill }) => {
		const info = props.skillVersions?.[id];
		return {
			id,
			skill,
			info,
			state: info ? skillVersionState(info) : undefined,
			outdated: !info && outdatedSkillIds.value.has(id),
			invalidReasons: skillIssueMessages.value.get(id) ?? [],
		};
	}),
);

const diff = ref<{ skillId: string; range: SkillVersionRange } | null>(null);
const diffRow = computed(() => rows.value.find((row) => row.id === diff.value?.skillId));

function skillName(row: Pick<SkillRow, 'id' | 'skill'>): string {
	return row.skill.name || row.id;
}

function hintText(row: SkillRow): string {
	const state = row.state;
	if (!state) return '';
	if (state.kind === 'pinned') {
		return i18n.baseText('agents.builder.skills.version.hint.pinned', {
			interpolate: { latest: String(state.latest) },
		});
	}
	return i18n.baseText('agents.builder.skills.version.hint.liveBehind', {
		interpolate: { version: String(state.draft) },
	});
}

/** An invalid skill shows its issues. Else an outdated one shows the older-version warning. */
function alertReasons(row: SkillRow): string[] {
	if (row.invalidReasons.length > 0) return row.invalidReasons;
	return row.outdated ? outdatedWarning.value : [];
}

function openDiff(skillId: string, range: SkillVersionRange) {
	diff.value = { skillId, range };
}

function onDiffOpenChange(open: boolean) {
	if (!open) diff.value = null;
}

function onDiffOpenSkill() {
	const skillId = diff.value?.skillId;
	diff.value = null;
	if (skillId) emit('open-skill', skillId);
}

function onDiffFollowLatest() {
	const skillId = diff.value?.skillId;
	diff.value = null;
	if (skillId) emit('set-skill-version', skillId, null);
}

const SCOPE_LABEL_KEYS = {
	project: 'tools.connection.categories.project',
	agent: 'tools.connection.categories.thisAgent',
	instance: 'tools.connection.categories.global',
} as const;

/** "Where the skill lives · description", with the same scope words as the skill picker. */
function rowSubtitle(row: {
	skill: { description?: string };
	info?: AgentSkillVersionInfo;
}): string {
	const scope = row.info ? i18n.baseText(SCOPE_LABEL_KEYS[row.info.scope]) : undefined;
	return [scope, row.skill.description].filter(Boolean).join(' · ');
}
</script>

<template>
	<div :class="$style.section" :inert="props.disabled || undefined">
		<N8nText v-if="props.showLabel && rows.length > 0" bold :class="$style.label">
			{{ i18n.baseText('agents.builder.skills.title') }}
		</N8nText>

		<div :class="$style.content">
			<div v-if="rows.length > 0" :class="$style.list" role="list">
				<AgentItemContextMenu
					v-for="row in rows"
					:key="row.id"
					:disabled="props.disabled"
					@remove="emit('remove-skill', row.id)"
				>
					<div
						:class="[
							$style.row,
							{
								[$style.invalid]: row.invalidReasons.length > 0,
								[$style.warning]: row.outdated && row.invalidReasons.length === 0,
							},
						]"
						role="listitem"
						:data-skill-id="row.id"
						data-testid="agent-skill-row"
					>
						<div :class="$style.main">
							<div :class="$style.nameLine">
								<button
									type="button"
									:class="$style.name"
									:disabled="props.disabled"
									data-testid="agent-capabilities-skill-row"
									@click="emit('open-skill', row.id)"
								>
									{{ skillName(row) }}
								</button>
								<N8nTooltip v-if="alertReasons(row).length > 0" placement="top">
									<N8nIcon
										icon="triangle-alert"
										:size="14"
										:class="row.invalidReasons.length > 0 ? $style.invalidIcon : $style.warningIcon"
										:data-testid="
											row.invalidReasons.length > 0
												? 'agent-chip-invalid-icon'
												: 'agent-chip-warning-icon'
										"
									/>
									<template #content>
										<div v-for="reason in alertReasons(row)" :key="reason">{{ reason }}</div>
									</template>
								</N8nTooltip>
							</div>
							<N8nText
								v-if="row.skill.description || row.info"
								size="small"
								color="text-light"
								:class="$style.description"
								data-testid="agent-skill-row-description"
							>
								{{ rowSubtitle(row) }}
							</N8nText>
							<N8nText
								v-if="row.state?.changes"
								size="small"
								:class="[
									$style.hint,
									row.state.kind === 'pinned' ? $style.hintPinned : $style.hintInfo,
								]"
								data-testid="agent-skill-version-hint"
							>
								{{ hintText(row) }}
								<button
									type="button"
									:class="$style.hintAction"
									:disabled="props.disabled"
									data-testid="agent-skill-see-changes"
									@click="row.state?.changes && openDiff(row.id, row.state.changes)"
								>
									{{ i18n.baseText('agents.builder.skills.version.seeChanges') }}
								</button>
								<button
									v-if="row.state.kind === 'pinned'"
									type="button"
									:class="$style.hintAction"
									:disabled="props.disabled"
									data-testid="agent-skill-follow-latest"
									@click="emit('set-skill-version', row.id, null)"
								>
									{{ i18n.baseText('agents.builder.skills.version.followLatest') }}
								</button>
								<template v-else>
									{{ i18n.baseText('agents.builder.skills.version.hint.testThenPublish') }}
								</template>
							</N8nText>
						</div>

						<AgentSkillVersionBadge
							v-if="row.info"
							:skill-id="row.id"
							:info="row.info"
							:loader="versionLoader"
							:disabled="props.disabled"
							@pin="(versionId) => emit('set-skill-version', row.id, versionId)"
							@follow-latest="emit('set-skill-version', row.id, null)"
							@compare="(from, to) => openDiff(row.id, { from, to })"
						/>

						<N8nTooltip :content="i18n.baseText('agents.builder.skills.remove')" placement="top">
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="small"
								:disabled="props.disabled"
								:aria-label="i18n.baseText('agents.builder.skills.remove')"
								data-testid="agent-skill-row-remove"
								@click="emit('remove-skill', row.id)"
							/>
						</N8nTooltip>
					</div>
				</AgentItemContextMenu>
			</div>

			<N8nButton
				:class="[$style.addButton, rows.length === 0 && $style.emptyAddButton]"
				variant="ghost"
				size="small"
				:disabled="props.disabled"
				data-testid="agent-capabilities-add-skill"
				@click="emit('add-skill')"
			>
				<template #icon>
					<N8nIcon icon="plus" :size="14" />
				</template>
				{{ i18n.baseText('agents.builder.skills.add') }}
			</N8nButton>
		</div>

		<AgentSkillVersionDiffDialog
			v-if="diff && diffRow?.info"
			open
			:skill-id="diff.skillId"
			:skill-name="skillName(diffRow)"
			:info="diffRow.info"
			:range="diff.range"
			:loader="versionLoader"
			@update:open="onDiffOpenChange"
			@open-skill="onDiffOpenSkill"
			@follow-latest="onDiffFollowLatest"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.section {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

/* Matches the label column of the chip rows next to it. */
.label {
	opacity: var(--agent-row-label-opacity, 1);
	--n8n--row-label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--n8n--row-label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.list {
	display: flex;
	flex-direction: column;
	align-self: stretch;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;
}

.row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	user-select: none;

	& + & {
		border-top: var(--border);
	}
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.nameLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.name {
	min-width: 0;
	padding: 0;
	border: none;
	background: none;
	font-family: inherit;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	color: var(--text-color);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	cursor: pointer;

	&:hover:not(:disabled) {
		text-decoration: underline;
	}

	&:focus-visible {
		@include focus.focus-ring;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.invalidIcon {
	display: block;
	flex-shrink: 0;
	color: var(--color--danger);
}

.warningIcon {
	display: block;
	flex-shrink: 0;
	color: var(--color--warning);
}

.invalid {
	box-shadow: inset var(--spacing--5xs) 0 0 var(--color--danger);
}

.warning {
	box-shadow: inset var(--spacing--5xs) 0 0 var(--color--warning);
}

.description {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hint {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--4xs);
}

.hintInfo {
	color: var(--text-color--info);
}

.hintPinned {
	color: var(--text-color--warning);
}

.hintAction {
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	color: var(--text-color);
	text-decoration: underline;
	cursor: pointer;

	&:disabled {
		cursor: default;
		color: var(--text-color--subtler);
	}
}

.addButton {
	--button--color: var(--text-color--subtle);

	&:hover {
		--button--color: var(--text-color);
	}
}

.emptyAddButton {
	margin-left: calc(-1 * var(--spacing--xs));
}

@media (max-width: 768px) {
	.section {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
	}
}
</style>
