<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { computed, nextTick, onMounted, ref, useCssModule, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	AGENT_SKILL_DESCRIPTION_MAX_LENGTH,
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	skillNameKey,
	type AgentSkillAvailability,
	type SkillCreateMethod,
	type SkillDetail,
	type SkillListItem,
	type SkillSyncedFrom,
	type SkillUsedBy,
	type SkillVersionDetail,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionDropdown,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nFormInput,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nSwitch,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { preferenceUserName } from '@/features/settings/context/context.utils';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	SkillConnectionItem,
	ToolCategoryKey,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import { getSkillDetail, listAttachableSkills } from '../composables/useAgentApi';
import { useSkillVersions } from '../composables/useSkillVersions';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentSkill } from '../types';
import {
	agentsLosingSkill,
	normalizeAgentSkillForSave,
	type SkillMoveTarget,
} from '../utils/agentSkill';
import AgentSkillFileNav from './AgentSkillFileNav.vue';
import AgentSkillUpload from './AgentSkillUpload.vue';
import AgentSkillViewer from './AgentSkillViewer.vue';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';
import SkillVersionDiff from './skillVersions/SkillVersionDiff.vue';
import SkillVersionTimeline from './skillVersions/SkillVersionTimeline.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillModalScopeOption = {
	value: string;
	label: string;
	icon: IconName;
	/** Where the option puts the skill, so the modal can warn when agents would lose it. */
	target?: SkillMoveTarget;
};

/** What a failed `onConfirm` returns. The modal stays open and shows `nameError` on the name. */
export type AgentSkillConfirmFailure = { saved: false; nameError?: string };

/** `undefined` closes the modal. A callback without a `return` gives it. */
export type AgentSkillConfirmResult = AgentSkillConfirmFailure | undefined;

export type AgentSkillModalData = {
	/** Set when opened from an agent. Absent when opened from Settings > Context > Skills. */
	projectId?: string;
	agentId?: string;
	skill?: AgentSkill;
	skillId?: string;
	/**
	 * Names of the agent's other skills, so a duplicate name blocks save while
	 * the modal is still open — skill names must be unique per agent.
	 */
	existingSkillNames?: string[];
	skillRefsEnabled?: boolean;
	getAttachedSkills?: () => Array<{ id: string; name: string }>;
	/** The agent's project as the user knows it. Names the picker tab and the "available to" option. */
	projectLabel?: string;
	canCreateInstanceSkills?: boolean;
	/**
	 * Settings only: where the skill can be added. On create the user picks one and the
	 * value comes back in `onConfirm`. The agent builder uses `availableTo` instead.
	 */
	scopeOptions?: AgentSkillModalScopeOption[];
	initialScope?: string;
	/** Settings only. Absent disables Assistant availability editing for every scope. */
	availableToAssistant?: boolean;
	availableToMCP?: boolean;
	/**
	 * A default name that no skill in the scope has yet, as new workflows get one. Called
	 * when the user starts a skill by hand, with the Settings scope value or, in the agent
	 * builder, the "available to" value.
	 */
	getDefaultName?: (scope: string) => Promise<string>;
	/** Locks the scope field and explains why in a tooltip. */
	scopeLockedReason?: string;
	/** Settings only: the agents that use the skill, to warn about a scope that drops them. */
	usedBy?: SkillUsedBy;
	/** Shows the skill without edit controls, for a user who can use but not change it. */
	readOnly?: boolean;
	/** Set for a skill synced from a source: its content is read-only and changes in the source. */
	syncedFrom?: SkillSyncedFrom;
	/** The agent the modal was opened from, for "Add to <agent>" in the header menu. */
	agentName?: string;
	/**
	 * Settings only: deletes the skill. The caller asks for confirmation and closes the
	 * modal. Absent hides "Delete skill" from the header menu.
	 */
	onDelete?: (id: string) => void | Promise<void>;
	/** Why "Delete skill" is disabled, for example because agents use the skill. */
	deleteDisabledReason?: string;
	/**
	 * Settings only: stops syncing a synced skill. The caller asks for confirmation and
	 * closes the modal. Absent, or a skill the user may not stop syncing, hides the action.
	 */
	onStopSyncing?: (id: string) => void | Promise<void>;
	/** The latest version of a saved hub skill. Set means the skill has versions to show. */
	latestVersion?: number;
	/** Opens the editor with the Versions panel shown ("View timeline" in Settings). */
	initialVersionsOpen?: boolean;
	/** Opens the editor comparing the latest version with the one before it. */
	initialCompare?: boolean;
	/** Agent builder: the versions the agent's draft and published agent run. */
	agentVersions?: { draft: number; published: number | null; pinned: boolean };
	/** Agent builder: pins the agent draft to a saved version. The caller reopens the editor. */
	onUseVersion?: (skillId: string, version: SkillVersionDetail) => void;
	/**
	 * Called on Save. A promise keeps the modal open until it settles. It closes unless the
	 * result is an `AgentSkillConfirmFailure`, so a refused save keeps what the user typed.
	 */
	onConfirm: (payload: {
		id?: string;
		skill: AgentSkill;
		availableTo?: AgentSkillAvailability;
		scope?: string;
		availableToAssistant?: boolean;
		availableToMCP?: boolean;
		/** Set on create only: whether the user typed the skill or uploaded it. */
		method?: SkillCreateMethod;
	}) => AgentSkillConfirmResult | Promise<AgentSkillConfirmResult>;
	outdated?: boolean;
	onUseLatestVersion?: (id: string) => void;
	onAttach?: (skill: SkillListItem) => Promise<void>;
	onRemove?: (id: string) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentSkillModalData;
}>();

const i18n = useI18n();
const $style = useCssModule();
const message = useMessage();
const uiStore = useUIStore();
const router = useRouter();
const rootStore = useRootStore();
const { showError } = useToast();
const agentTelemetry = useAgentTelemetry();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const existingNameKeys = computed(() => {
	const names = props.data.getAttachedSkills
		? props.data.getAttachedSkills().map(({ name }) => name)
		: (props.data.existingSkillNames ?? []);
	return new Set(names.map(skillNameKey));
});

function getDefaultSkillName(): string {
	const baseName = i18n.baseText('agents.builder.skills.defaultName' as BaseTextKey);
	if (!existingNameKeys.value.has(skillNameKey(baseName))) return baseName;

	let suffix = 2;
	while (existingNameKeys.value.has(skillNameKey(`${baseName} ${suffix}`))) suffix += 1;
	return `${baseName} ${suffix}`;
}

function toFormSkill(source: AgentSkill | undefined): AgentSkill {
	return normalizeSkill({
		name: source?.name ?? getDefaultSkillName(),
		description: source?.description ?? '',
		instructions: source?.instructions ?? '',
		...(source?.references ? { references: source.references } : {}),
	});
}

const initialSkill = ref<AgentSkill>(toFormSkill(props.data.skill));
const skill = ref<AgentSkill>(cloneDeep(initialSkill.value));
const submitted = ref(false);
const formIsValid = ref(false);
const selectedPath = ref(SKILL_FILE);
const isEditing = computed(() => !!props.data.skillId);
// An upload lands on the edit step like a saved skill does, so the step alone cannot tell.
const createMethod = ref<SkillCreateMethod>('manual');
const hasPicker = !props.data.skillId && !!props.data.skillRefsEnabled && !!props.data.onAttach;
const step = ref<'select' | 'preview' | 'upload' | 'manual' | 'edit'>(
	props.data.skill || props.data.skillId ? 'edit' : hasPicker ? 'select' : 'upload',
);
/** The form steps show the scope badge, the header menu and "Close" instead of "Cancel". */
const isFormStep = computed(() => step.value === 'manual' || step.value === 'edit');
const isImporting = ref(false);
const isSaving = ref(false);
/** A name error from the server, such as a taken name. Typing a new name clears it. */
const serverNameError = ref('');
const scope = ref(props.data.initialScope ?? props.data.scopeOptions?.[0]?.value ?? '');
const availableToAssistant = ref(props.data.availableToAssistant ?? false);
const showAssistantAvailability = computed(
	() =>
		props.data.availableToAssistant !== undefined &&
		(scope.value === 'instance' || scope.value.startsWith('project:')),
);
const assistantAvailabilityChanged = computed(
	() =>
		showAssistantAvailability.value &&
		availableToAssistant.value !== props.data.availableToAssistant,
);
const availableToMCP = ref(props.data.availableToMCP ?? false);
const showAvailableToMCP = computed(
	() =>
		props.data.availableToMCP !== undefined &&
		(scope.value === 'instance' || scope.value.startsWith('project:')),
);
const availableToMCPChanged = computed(
	() => showAvailableToMCP.value && availableToMCP.value !== props.data.availableToMCP,
);

/** The last default name the server gave. A name the user typed is never replaced. */
const serverDefaultName = ref<string | null>(null);
/** Save waits for the lookup, so a taken local default cannot fail after the modal closes. */
const defaultNameLoading = ref(false);
let latestNameRequest = 0;

async function refreshDefaultName() {
	if (!props.data.getDefaultName || props.data.skillId) return;
	const current = skill.value.name;
	if (current !== getDefaultSkillName() && current !== serverDefaultName.value) return;
	const request = ++latestNameRequest;
	const requestedScope = nameScope.value;
	defaultNameLoading.value = true;
	try {
		const name = await props.data.getDefaultName(requestedScope);
		// Only the newest answer for the scope still selected counts, and only while the
		// user has not typed a name of their own.
		if (request !== latestNameRequest || nameScope.value !== requestedScope) return;
		if (skill.value.name !== current) return;
		serverDefaultName.value = name;
		skill.value = { ...skill.value, name };
	} catch {
		// Keep the local default. The save still refuses a taken name.
	} finally {
		if (request === latestNameRequest) defaultNameLoading.value = false;
	}
}

function onAddManually() {
	createMethod.value = 'manual';
	step.value = 'manual';
	void refreshDefaultName();
}

const showScope = computed(() => !!props.data.scopeOptions?.length && step.value !== 'preview');
const canChangeScope = computed(
	() => showScope.value && !props.data.scopeLockedReason && !props.data.readOnly,
);
const availableTo = ref<AgentSkillAvailability>('project');
/**
 * Where the new skill goes, for its default name: the scope field in Settings, or
 * "available to" in the agent builder. `getDefaultName` gets this value.
 */
const nameScope = computed<string>(() => (showScope.value ? scope.value : availableTo.value));
// A new scope can hold other names, so a default name follows the scope.
watch(nameScope, () => {
	if (step.value === 'manual') void refreshDefaultName();
});

const librarySkills = ref<SkillListItem[]>([]);
const libraryLoading = ref(false);
const attachedSkills = computed(() => props.data.getAttachedSkills?.() ?? []);
const attachedSkillIds = computed(() => new Set(attachedSkills.value.map(({ id }) => id)));
const attachingSkillIds = ref(new Set<string>());
const pickerItems = computed<SkillConnectionItem[]>(() =>
	librarySkills.value.map((librarySkill) => {
		const attached = attachedSkillIds.value.has(librarySkill.id);
		const attaching = attachingSkillIds.value.has(librarySkill.id);
		const similarNameReason =
			attached || attaching ? undefined : getSimilarNameReason(librarySkill.name);
		return {
			id: `skill:${librarySkill.id}`,
			kind: 'skill',
			skillId: librarySkill.id,
			title: librarySkill.name,
			description: librarySkill.description,
			category: getPickerCategory(librarySkill),
			status: 'none',
			attached: attached || attaching,
			attaching,
			disabled: similarNameReason !== undefined,
			...(similarNameReason ? { disabledReason: similarNameReason } : {}),
		};
	}),
);

const previewSkill = ref<SkillDetail | null>(null);
const previewPath = ref(SKILL_FILE);
const previewLoading = ref(false);
const previewIsAdded = computed(
	() => !!previewSkill.value && attachedSkillIds.value.has(previewSkill.value.id),
);
const showRemove = computed(() => {
	if (!props.data.onRemove) return false;
	if (step.value === 'preview') return previewIsAdded.value;
	// A hub skill is detached with "Add to <agent>" in the header menu.
	return isEditing.value && !props.data.skillRefsEnabled;
});

const footerPrimaryAction = computed<'add' | 'save' | 'useLatest' | 'viewing' | undefined>(() => {
	if (step.value === 'select') return undefined;
	if (step.value === 'preview') return previewIsAdded.value ? undefined : 'add';
	if (viewedVersion.value) return 'viewing';
	// A pinned skill shows Save skill disabled, as the design does.
	if (isPinned.value) return 'save';
	if (isOutdated.value) return props.data.onUseLatestVersion ? 'useLatest' : undefined;
	return isReadOnly.value ? undefined : 'save';
});
const modalTitle = computed(() => {
	if (step.value === 'select') return i18n.baseText('agents.builder.skills.title');
	if (step.value === 'upload') return i18n.baseText('agents.builder.skills.add');
	if (step.value === 'preview') return previewSkill.value?.name ?? '';
	return viewedVersion.value?.skill.name ?? skill.value.name;
});

const skillAccess = ref<SkillDetail | null>(null);
const skillAccessLoading = ref(false);
const skillAccessFailed = ref(false);
/** A pinned skill is read-only in the builder: the agent runs that version, not the latest. */
const isPinned = computed(() => isEditing.value && !!props.data.agentVersions?.pinned);
const isOutdated = computed(() => isEditing.value && !!props.data.outdated);
/**
 * Where a synced skill comes from, for the banner and the source link. The server already
 * marks a synced skill `canEdit: false`, so it does not feed the read-only rule here.
 */
const syncedFrom = computed(() => props.data.syncedFrom ?? skillAccess.value?.syncedFrom ?? null);
const canStopSyncing = computed(
	() => !!syncedFrom.value?.canStopSyncing && !!props.data.onStopSyncing && !!props.data.skillId,
);

/** True while a stop runs, so a second click cannot send it again. */
const isStoppingSync = ref(false);

async function onStopSyncing() {
	if (!props.data.skillId || !props.data.onStopSyncing || isStoppingSync.value) return;
	isStoppingSync.value = true;
	try {
		await props.data.onStopSyncing(props.data.skillId);
	} finally {
		isStoppingSync.value = false;
	}
}
const isReadOnly = computed(
	() =>
		props.data.readOnly === true ||
		skillAccessLoading.value ||
		skillAccessFailed.value ||
		skillAccess.value?.canEdit === false ||
		isOutdated.value ||
		isPinned.value,
);
const cannotEdit = computed(
	() =>
		props.data.readOnly === true ||
		skillAccess.value?.canEdit === false ||
		isOutdated.value ||
		isPinned.value,
);
/** Save sends a snapshot, so the editor is locked until the answer comes back. */
const editorLocked = computed(() => isReadOnly.value || isSaving.value);
const savedTarget = computed<AgentSkillAvailability | undefined>(() => {
	if (!skillAccess.value) return undefined;
	if (skillAccess.value.agentId) return 'agent';
	return skillAccess.value.scope === 'instance' ? 'instance' : 'project';
});
const showAvailabilitySelect = computed(() => {
	if (!props.data.skillRefsEnabled || step.value === 'preview') return false;
	if (!isEditing.value) return true;
	return !!savedTarget.value && !cannotEdit.value;
});
const showInstanceTarget = computed(
	() => !!props.data.canCreateInstanceSkills || savedTarget.value === 'instance',
);
const AVAILABILITY_ICONS = {
	project: 'layers',
	agent: 'bot',
	instance: 'globe',
} as const satisfies Record<AgentSkillAvailability, string>;
const availabilityOptions = computed(() => [
	// The modal hides the page behind it, so the project option names the project.
	{
		value: 'project' as const,
		label: props.data.projectLabel ?? i18n.baseText('agents.builder.skills.availableTo.project'),
	},
	{ value: 'agent' as const, label: i18n.baseText('agents.builder.skills.availableTo.agent') },
	...(showInstanceTarget.value
		? [
				{
					value: 'instance' as const,
					label: i18n.baseText('agents.builder.skills.availableTo.instance'),
				},
			]
		: []),
]);
type ScopeChoice = { value: string; label: string; icon: IconName };

/**
 * The scope badge in the header and the "Change scope" submenu. Settings picks from
 * `scopeOptions`, the agent builder from the "available to" targets.
 */
const scopeChoices = computed<ScopeChoice[]>(() => {
	if (showScope.value) return props.data.scopeOptions ?? [];
	return availabilityOptions.value.map((option) => ({
		...option,
		icon: AVAILABILITY_ICONS[option.value],
	}));
});
const selectedScopeValue = computed(() => (showScope.value ? scope.value : availableTo.value));
const selectedScope = computed(() =>
	scopeChoices.value.find((choice) => choice.value === selectedScopeValue.value),
);
const showScopeBadge = computed(
	() =>
		isFormStep.value &&
		(showScope.value ||
			(!!props.data.skillRefsEnabled && (!isEditing.value || !!savedTarget.value))),
);
const scopeEditable = computed(() =>
	showScope.value ? canChangeScope.value && !isSaving.value : showAvailabilitySelect.value,
);

function onScopeChoice(value: string) {
	if (!scopeEditable.value) return;
	if (showScope.value) {
		scope.value = value;
		return;
	}
	if (value === 'project' || value === 'agent' || value === 'instance') availableTo.value = value;
}

function scopeItems(testIdPrefix: string): Array<ActionDropdownItem<string>> {
	return scopeChoices.value.map((choice) => ({
		id: `scope:${choice.value}`,
		label: choice.label,
		icon: choice.icon,
		checked: choice.value === selectedScopeValue.value,
		testId: `${testIdPrefix}${choice.value}`,
	}));
}
const scopeBadgeItems = computed(() => scopeItems('agent-skill-scope-option-'));

/** "Add to <agent>" toggles the attachment of a hub skill to the agent it was opened from. */
const showAttachToggle = computed(
	() =>
		step.value === 'edit' &&
		isEditing.value &&
		!!props.data.skillRefsEnabled &&
		!!props.data.agentId &&
		!!props.data.onRemove,
);
const headerMenuItems = computed<Array<ActionDropdownItem<string>>>(() => {
	const items: Array<ActionDropdownItem<string>> = [];
	if (showAttachToggle.value) {
		items.push({
			id: 'attach',
			label: props.data.agentName
				? i18n.baseText('agents.builder.skills.menu.addToAgent', {
						interpolate: { agent: props.data.agentName },
					})
				: i18n.baseText('agents.builder.skills.menu.addToThisAgent'),
			icon: 'bot',
			// The row draws a switch that is on: the skill is attached.
			customClass: $style.menuItem,
			testId: 'agent-skill-menu-attach',
		});
	}
	if (showScopeBadge.value) {
		items.push({
			id: 'change-scope',
			label: i18n.baseText('agents.builder.skills.menu.changeScope'),
			icon: 'globe',
			disabled: !scopeEditable.value,
			customClass: $style.menuItem,
			testId: 'agent-skill-menu-change-scope',
			children: scopeItems('agent-skill-menu-scope-option-').map((item) => ({
				...item,
				customClass: $style.menuItem,
			})),
		});
	}
	if (isEditing.value && (props.data.onDelete || showAttachToggle.value)) {
		items.push({
			id: 'delete',
			label: i18n.baseText('agents.builder.skills.menu.delete'),
			icon: 'trash-2',
			divided: items.length > 0,
			// A skill attached to this agent is in use, so the builder cannot delete it.
			disabled: !props.data.onDelete || !!props.data.deleteDisabledReason || isSaving.value,
			customClass: [$style.menuItem, $style.deleteItem].join(' '),
			testId: 'agent-skill-menu-delete',
		});
	}
	return items;
});

function onHeaderMenuSelect(action: string) {
	if (action.startsWith('scope:')) {
		onScopeChoice(action.slice('scope:'.length));
		return;
	}
	if (action === 'attach') {
		onRemove();
		return;
	}
	if (action === 'delete' && props.data.skillId && props.data.onDelete) {
		void props.data.onDelete(props.data.skillId);
	}
}

/** Where a changed scope or "available to" field moves the skill, with its label and users. */
const pendingMove = computed<
	{ target: SkillMoveTarget; destination: string; usage: SkillUsedBy } | undefined
>(() => {
	if (showScope.value) {
		if (!canChangeScope.value || scope.value === props.data.initialScope) return undefined;
		const option = props.data.scopeOptions?.find(({ value }) => value === scope.value);
		const usage = props.data.usedBy;
		return option?.target && usage
			? { target: option.target, destination: option.label, usage }
			: undefined;
	}
	const agentId = props.data.agentId;
	const usage = skillAccess.value?.usedBy;
	if (!showAvailabilitySelect.value || !isEditing.value || !agentId || !usage) return undefined;
	if (availableTo.value === savedTarget.value) return undefined;
	const target: SkillMoveTarget =
		availableTo.value === 'project'
			? { projectId: props.data.projectId ?? null, agentId: null }
			: { projectId: null, agentId: availableTo.value === 'agent' ? agentId : null };
	const option = availabilityOptions.value.find(({ value }) => value === availableTo.value);
	return { target, destination: option?.label ?? '', usage };
});
/**
 * The warning for a move that takes the skill from agents that use it, or an empty string.
 * The backend refuses such a move, so Save stays off while the warning shows.
 */
const accessWarning = computed(() => {
	if (!pendingMove.value) return '';
	const { target, destination, usage } = pendingMove.value;
	const { names, hidden } = agentsLosingSkill(usage, target, props.data.agentId);
	const parts: string[] = [];
	if (names.length > 0) {
		parts.push(
			i18n.baseText(
				target.agentId
					? 'agents.builder.skills.loseAccess.agentOnly'
					: 'agents.builder.skills.loseAccess',
				{
					interpolate: { agents: names.join(', '), destination },
					adjustToNumber: names.length,
				},
			),
		);
	}
	if (hidden > 0) {
		parts.push(
			i18n.baseText('agents.builder.skills.loseAccess.hidden', {
				interpolate: { count: hidden },
				adjustToNumber: hidden,
			}),
		);
	}
	return parts.join(' ');
});
const removeLabel = computed(() =>
	props.data.skillRefsEnabled
		? i18n.baseText('agents.builder.skills.detach')
		: i18n.baseText('agents.builder.skills.remove'),
);
const footerHint = computed(() => {
	const shownSkill = step.value === 'preview' ? previewSkill.value : skillAccess.value;
	if (step.value === 'edit' && isOutdated.value) {
		return isPinned.value ? '' : i18n.baseText('agents.builder.skills.hint.outdated');
	}
	if (!shownSkill || (step.value !== 'preview' && step.value !== 'edit')) return '';
	if (!shownSkill.canEdit) {
		return shownSkill.scope === 'instance'
			? i18n.baseText('agents.builder.skills.hint.readOnly.instance')
			: i18n.baseText('agents.builder.skills.hint.readOnly.project');
	}
	if (step.value !== 'preview' || previewIsAdded.value) return '';
	return i18n.baseText('agents.builder.skills.hint.addToEdit');
});

const canAddReference = computed(
	() => (skill.value.references ?? []).length < AGENT_SKILL_REFERENCE_MAX_COUNT,
);
// A skill saved through this modal always has instructions (required below), so
// empty instructions on an existing ref mean its stored content is gone — the
// backend validation issue this modal opened from. Detected from the opening
// data rather than threaded validation state, so it stays correct even if this
// modal is ever opened from a surface that doesn't know about validation issues.
const openedWithMissingContent = computed(
	() => isEditing.value && !(props.data.skill?.instructions ?? '').trim(),
);

const validationErrors = computed<Partial<Record<keyof AgentSkill, string>>>(() => {
	const errors: Partial<Record<keyof AgentSkill, string>> = {};
	const name = skill.value.name.trim();
	const description = skill.value.description.trim();
	const instructions = skill.value.instructions.trim();

	if (!name) {
		errors.name = i18n.baseText('agents.builder.skills.validation.nameRequired');
	} else if (name.length > 128) {
		errors.name = i18n.baseText('agents.builder.skills.validation.nameMaxLength');
	} else if (existingNameKeys.value.has(skillNameKey(name))) {
		errors.name = i18n.baseText('agents.builder.skills.validation.nameDuplicate');
	}

	if (!description) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionRequired');
	} else if (description.length > AGENT_SKILL_DESCRIPTION_MAX_LENGTH) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionMaxLength', {
			interpolate: { max: AGENT_SKILL_DESCRIPTION_MAX_LENGTH.toLocaleString() },
		});
	}

	if (!instructions) {
		errors.instructions = i18n.baseText('agents.builder.skills.validation.instructionsRequired');
	} else if (skill.value.instructions.length > AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH) {
		errors.instructions = i18n.baseText('agents.builder.skills.validation.instructionsMaxLength', {
			interpolate: { max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString() },
		});
	}
	if (skill.value.references?.some((reference) => !reference.content.trim())) {
		errors.references = i18n.baseText('agents.builder.skills.references.invalidSummary');
	}

	return errors;
});

/** Reference files that block a save: empty, or longer than the limit. */
const invalidReferencePaths = computed(() =>
	(skill.value.references ?? [])
		.filter(
			(reference) =>
				!reference.content.trim() ||
				reference.content.length > AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
		)
		.map((reference) => reference.path),
);
const visibleInvalidReferencePaths = computed(() =>
	submitted.value ? invalidReferencePaths.value : [],
);

/**
 * A blocked save must show why. Open the file that holds the problem: the first broken
 * reference, else SKILL.md when its fields are invalid and a reference is open.
 */
function showFirstInvalidFile() {
	const [firstInvalidReference] = invalidReferencePaths.value;
	if (firstInvalidReference) {
		selectedPath.value = firstInvalidReference;
		return;
	}
	const { references: _references, ...skillFileErrors } = validationErrors.value;
	if (Object.keys(skillFileErrors).length > 0) selectedPath.value = SKILL_FILE;
}

const visibleErrors = computed(() =>
	submitted.value || openedWithMissingContent.value ? validationErrors.value : {},
);
const visibleNameError = computed(
	() => (submitted.value ? validationErrors.value.name : undefined) ?? serverNameError.value,
);
const canSave = computed(
	() => formIsValid.value && !validationErrors.value.name && !isReadOnly.value,
);
const hasChanges = computed(
	() =>
		!isEditing.value ||
		!isEqual(skill.value, initialSkill.value) ||
		assistantAvailabilityChanged.value ||
		availableToMCPChanged.value ||
		(showAvailabilitySelect.value && availableTo.value !== savedTarget.value) ||
		(canChangeScope.value && scope.value !== props.data.initialScope),
);

function getSimilarNameReason(name: string): string | undefined {
	const key = skillNameKey(name);
	const similarNames = attachedSkills.value
		.map((attachedSkill) => attachedSkill.name)
		.filter((attachedName) => skillNameKey(attachedName) === key);
	if (similarNames.length === 0) return undefined;
	return i18n.baseText('agents.builder.skills.picker.similarName', {
		interpolate: { names: [...similarNames, name].map((value) => `"${value}"`).join(', ') },
	});
}

function getPickerCategory(librarySkill: SkillListItem): 'project' | 'this-agent' | 'global' {
	if (librarySkill.scope === 'instance') return 'global';
	return librarySkill.agentId ? 'this-agent' : 'project';
}

async function loadLibrarySkills() {
	// The picker lists what one agent may attach. Settings opens the modal without an agent.
	if (!props.data.agentId) return;
	libraryLoading.value = true;
	try {
		librarySkills.value = await listAttachableSkills(rootStore.restApiContext, props.data.agentId);
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.skills.picker.loadError'));
	} finally {
		libraryLoading.value = false;
	}
}

function targetForPickerCategory(category: ToolCategoryKey): AgentSkillAvailability {
	if (category === 'project') return 'project';
	if (category === 'global' && props.data.canCreateInstanceSkills) return 'instance';
	return 'agent';
}

function onPickerCreate(category: ToolCategoryKey) {
	availableTo.value = targetForPickerCategory(category);
	step.value = 'upload';
}

async function loadSkillAccess(skillId: string) {
	skillAccessLoading.value = true;
	try {
		skillAccess.value = await getSkillDetail(rootStore.restApiContext, skillId);
		availableTo.value = savedTarget.value ?? 'project';
	} catch (error) {
		skillAccess.value = null;
		skillAccessFailed.value = true;
		showError(error, i18n.baseText('agents.builder.skills.accessError'));
	} finally {
		skillAccessLoading.value = false;
	}
}

function onPickerItemAttach(item: ToolConnectionItem) {
	if (item.kind !== 'skill' || item.disabled || item.attached) return;
	void attachLibrarySkill(item.skillId);
}

async function onPickerItemPreview(item: ToolConnectionItem) {
	if (item.kind !== 'skill' || item.disabled) return;
	previewLoading.value = true;
	try {
		previewSkill.value = await getSkillDetail(rootStore.restApiContext, item.skillId);
		previewPath.value = SKILL_FILE;
		step.value = 'preview';
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.skills.picker.previewError'));
	} finally {
		previewLoading.value = false;
	}
}

async function attachLibrarySkill(skillId: string) {
	const librarySkill = librarySkills.value.find((candidate) => candidate.id === skillId);
	if (!librarySkill || !props.data.onAttach) return;
	attachingSkillIds.value = new Set([...attachingSkillIds.value, skillId]);
	try {
		await props.data.onAttach(librarySkill);
	} finally {
		const remaining = new Set(attachingSkillIds.value);
		remaining.delete(skillId);
		attachingSkillIds.value = remaining;
	}
}

/** Opens Settings > Context > Skills in a new tab, so the agent and the picker stay open. */
function onManageSkills() {
	window.open(router.resolve({ name: VIEWS.SETTINGS_CONTEXT_SKILLS }).href, '_blank', 'noopener');
}

function onPreviewAdd() {
	if (!previewSkill.value) return;
	void attachLibrarySkill(previewSkill.value.id);
	step.value = 'select';
}

onMounted(() => {
	if (hasPicker) void loadLibrarySkills();
	if (props.data.skillId && props.data.skillRefsEnabled) void loadSkillAccess(props.data.skillId);
});

const showAssistantToggle = computed(
	() => showScope.value && showAssistantAvailability.value && !cannotEdit.value,
);
const showMcpToggle = computed(
	() => showScope.value && showAvailableToMCP.value && !cannotEdit.value,
);

const latestVersion = computed(() => (props.data.skillId ? props.data.latestVersion : undefined));
const versionsOpen = ref(!!props.data.initialVersionsOpen);
const {
	versions,
	viewedVersion,
	loadVersions,
	fetchVersion,
	openVersion,
	comparison,
	diffSections,
	diffCounts,
	comparedSkill,
	compareVersions,
	compareLatestTwo,
} = useSkillVersions(
	() => props.data.skillId,
	() => baseVersion.value,
);

/** The version the editor shows: the one a pinned agent runs, else the latest. */
const baseVersion = computed(() =>
	isPinned.value ? props.data.agentVersions?.draft : versions.value?.[0]?.version,
);

/** The warning strip of a pinned skill. Compare mode and an opened version have their own bars. */
const showPinnedBar = computed(() => isPinned.value && !viewedVersion.value && !comparison.value);
/** The Versions panel shows beside the editor once its list has loaded. Compare mode hides it. */
const showVersionsPanel = computed(
	() => isFormStep.value && versionsOpen.value && !!versions.value && !comparison.value,
);
// The list loads the first time the panel opens.
watch(
	versionsOpen,
	(open) => {
		if (open) void loadVersions();
	},
	{ immediate: true },
);
const displayedSkill = computed(() => viewedVersion.value?.skill ?? skill.value);
const viewingText = computed(() => {
	const viewed = viewedVersion.value;
	if (!viewed) return '';
	const { date, time } = convertToDisplayDate(viewed.createdAt);
	// A pinned agent can open the latest version, which is newer than the one on screen.
	const key =
		viewed.version === versions.value?.[0]?.version
			? 'agents.builder.skills.versions.viewingLatest'
			: 'agents.builder.skills.versions.viewing';
	return i18n.baseText(key, {
		interpolate: {
			version: viewed.version,
			author:
				preferenceUserName(viewed.createdBy) ||
				i18n.baseText('agents.builder.skills.versions.unknownUser'),
			date,
			time: time.slice(0, 5),
		},
	});
});
const canRestore = computed(() => !isReadOnly.value);

async function onOpenVersion(version: number) {
	selectedPath.value = SKILL_FILE;
	await openVersion(version);
}

const versionOptions = computed(() =>
	(versions.value ?? []).map(({ version }) => ({
		value: version,
		label: i18n.baseText('agents.builder.skills.versions.number', { interpolate: { version } }),
	})),
);

/** The agent the builder opened the editor from, for the markers and "Use in <agent>". */
const timelineAgent = computed(() =>
	props.data.agentVersions && props.data.agentName
		? { name: props.data.agentName, ...props.data.agentVersions }
		: undefined,
);
const versionsButtonLabel = computed(() => {
	const agentVersions = props.data.agentVersions;
	const key = !agentVersions
		? 'agents.builder.skills.versions.number'
		: agentVersions.pinned
			? 'agents.builder.skills.versions.usingVersion'
			: 'agents.builder.skills.versions.usingLatest';
	const version = agentVersions?.pinned ? agentVersions.draft : latestVersion.value;
	return i18n.baseText(key, { interpolate: { version: version ?? '' } });
});

async function useVersion(version: number) {
	const skillId = props.data.skillId;
	if (!skillId || !props.data.onUseVersion) return;
	// A pin reopens the editor on the saved version, so unsaved edits would be lost.
	if (isEditing.value && hasChanges.value) {
		const choice = await message.confirm(
			i18n.baseText('agents.builder.skills.versions.discardEdits.message'),
			i18n.baseText('agents.builder.skills.versions.discardEdits.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('agents.builder.skills.versions.discardEdits.confirm'),
				cancelButtonText: i18n.baseText('agents.builder.skills.versions.discardEdits.cancel'),
			},
		);
		if (choice !== MODAL_CONFIRM || !modalOpen.value) return;
	}
	// The draft's own version needs no request: the list has its id, the editor its content.
	const summary = versions.value?.find((item) => item.version === version);
	const detail =
		summary && version === props.data.agentVersions?.draft && props.data.skill
			? { ...summary, skill: props.data.skill }
			: await fetchVersion(version);
	// The user may have closed the editor while the version loaded: then nothing is pinned.
	if (!detail || !modalOpen.value) return;
	props.data.onUseVersion(skillId, detail);
}

async function onCompare(a: number, b: number) {
	selectedPath.value = SKILL_FILE;
	await compareVersions(a, b);
}

/** Done leaves compare mode for the latest version, which the user can edit. */
function leaveCompare() {
	comparison.value = null;
	viewedVersion.value = null;
}

onMounted(() => {
	if (props.data.initialCompare) void compareLatestTwo();
});

/** Saves the content of an older version as the next version, like any other save. */
async function restoreVersion(version: number) {
	if (!canRestore.value || isSaving.value) return;
	const detail =
		viewedVersion.value?.version === version ? viewedVersion.value : await fetchVersion(version);
	if (!detail) return;
	await submit(normalizeSkill({ ...detail.skill }), {});
}

function onSkillUploaded(importedSkill: AgentSkill) {
	createMethod.value = 'upload';
	skill.value = normalizeSkill(importedSkill);
	serverNameError.value = '';
	selectedPath.value = SKILL_FILE;
	submitted.value = false;
	step.value = 'edit';
}

function onBack() {
	if (step.value === 'upload' || step.value === 'preview') {
		step.value = 'select';
		return;
	}
	skill.value = { name: getDefaultSkillName(), description: '', instructions: '' };
	serverNameError.value = '';
	selectedPath.value = SKILL_FILE;
	submitted.value = false;
	formIsValid.value = false;
	step.value = 'upload';
}

function onSkillUpdate(updates: Partial<AgentSkill>) {
	if (isReadOnly.value) return;
	if (updates.name !== undefined && updates.name !== skill.value.name) serverNameError.value = '';
	skill.value = normalizeSkill({ ...skill.value, ...updates });
	if (
		selectedPath.value !== SKILL_FILE &&
		!skill.value.references?.some((reference) => reference.path === selectedPath.value)
	) {
		selectedPath.value = SKILL_FILE;
	}
}

function normalizeSkill(skill: AgentSkill): AgentSkill {
	return normalizeAgentSkillForSave(skill);
}

function onAddReference() {
	if (!canAddReference.value) return;

	const path = nextReferencePath(skill.value.references ?? []);
	skill.value = {
		...skill.value,
		references: [...(skill.value.references ?? []), { path, content: '' }],
	};
	selectedPath.value = path;
}

function onRemoveReference(path: string) {
	skill.value = {
		...skill.value,
		references: (skill.value.references ?? []).filter((reference) => reference.path !== path),
	};
	if (selectedPath.value === path) {
		selectedPath.value = SKILL_FILE;
	}
}

function nextReferencePath(references: NonNullable<AgentSkill['references']>): string {
	const existingPaths = new Set(references.map((reference) => reference.path));
	let index = 1;
	let path = 'references/reference.md';
	while (existingPaths.has(path)) {
		index += 1;
		path = `references/reference-${index}.md`;
	}
	return path;
}

function onValidUpdate(valid: boolean) {
	formIsValid.value = valid;
}

function onImportSkill(payload: {
	source: 'skill_file' | 'folder';
	status: 'success' | 'error';
	referenceCount?: number;
	error?: string;
}) {
	// The import event belongs to the agent builder. Settings has no agent to name.
	if (!props.data.agentId) return;
	agentTelemetry.trackImportedSkill({
		agentId: props.data.agentId,
		...payload,
	});
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function onSave() {
	if (defaultNameLoading.value || isSaving.value || accessWarning.value) return;
	submitted.value = true;
	if (!canSave.value) {
		showFirstInvalidFile();
		return;
	}

	const payload = normalizeSkill({
		name: skill.value.name.trim(),
		description: skill.value.description.trim(),
		instructions: skill.value.instructions,
		...(skill.value.references ? { references: skill.value.references } : {}),
	});

	const targetChanged = !isEditing.value || availableTo.value !== savedTarget.value;
	await submit(payload, {
		...(showAvailabilitySelect.value && targetChanged ? { availableTo: availableTo.value } : {}),
		...(canChangeScope.value ? { scope: scope.value } : {}),
		...(assistantAvailabilityChanged.value
			? { availableToAssistant: availableToAssistant.value }
			: {}),
		...(availableToMCPChanged.value ? { availableToMCP: availableToMCP.value } : {}),
		...(isEditing.value ? {} : { method: createMethod.value }),
	});
}

/** Hands the skill to the caller. A refused save keeps the modal open with the user's edits. */
async function submit(
	payload: AgentSkill,
	extras: Omit<Parameters<AgentSkillModalData['onConfirm']>[0], 'id' | 'skill'>,
) {
	isSaving.value = true;
	let result: AgentSkillConfirmResult;
	try {
		result = await props.data.onConfirm({ id: props.data.skillId, skill: payload, ...extras });
	} catch {
		// The caller reports its own errors. Keep the modal open with the user's edits.
		return;
	} finally {
		isSaving.value = false;
	}
	if (result?.saved === false) {
		if (result.nameError) {
			serverNameError.value = result.nameError;
			await focusName();
		}
		return;
	}
	closeModal();
}

const nameField = useTemplateRef<HTMLElement>('nameField');

async function focusName() {
	await nextTick();
	nameField.value?.querySelector('input')?.focus();
}

// A new skill gets its name first, so the name takes the focus when it can be edited.
watch(step, async (next) => {
	if ((next === 'manual' || next === 'edit') && !isEditing.value && !isReadOnly.value) {
		await focusName();
	}
});

function onUseLatestVersion() {
	if (!props.data.skillId) return;
	props.data.onUseLatestVersion?.(props.data.skillId);
}

// After a version change the builder sends the saved skill to the open editor. Show it in place,
// so the editor does not close and open again.
watch(
	() => props.data.skill,
	(next) => {
		if (!next || !isEditing.value) return;
		initialSkill.value = toFormSkill(next);
		skill.value = cloneDeep(initialSkill.value);
		viewedVersion.value = null;
		comparison.value = null;
		if (props.data.initialVersionsOpen) versionsOpen.value = true;
		if (!(next.references ?? []).some((file) => file.path === selectedPath.value)) {
			selectedPath.value = SKILL_FILE;
		}
	},
);

function onRemove() {
	if (step.value === 'preview') {
		if (previewSkill.value) props.data.onRemove?.(previewSkill.value.id);
		step.value = 'select';
		return;
	}
	if (!props.data.skillId) return;
	props.data.onRemove?.(props.data.skillId);
	closeModal();
}
</script>

<template>
	<AgentModalMultiStep
		:open="modalOpen"
		:step="step"
		:title="modalTitle"
		:show-back="step === 'manual' || step === 'preview' || (step === 'upload' && hasPicker)"
		:show-footer="
			!comparison &&
			(step === 'select' || step === 'manual' || step === 'edit' || step === 'preview')
		"
		:show-cancel="step !== 'select' && !viewedVersion"
		:cancel-label="isFormStep ? i18n.baseText('generic.close') : undefined"
		:header-divider="isFormStep"
		:header-divider-tone="showPinnedBar ? 'warning' : 'default'"
		:body-flush="isFormStep"
		:fixed-size="isFormStep"
		:busy="isImporting || previewLoading || isSaving"
		size="fit"
		data-testid="agent-skill-modal"
		@update:open="!$event && closeModal()"
		@back="onBack"
	>
		<template v-if="showScopeBadge && selectedScope" #titlePrefix>
			<N8nTooltip
				:disabled="scopeEditable || !data.scopeLockedReason"
				:content="data.scopeLockedReason"
				placement="bottom"
			>
				<N8nActionDropdown
					:items="scopeBadgeItems"
					:disabled="!scopeEditable"
					placement="bottom-start"
					data-testid="agent-skill-scope"
					@select="onHeaderMenuSelect"
				>
					<template #activator>
						<N8nBadge
							variant="outline"
							:clickable="scopeEditable"
							:class="$style.scopeBadge"
							data-testid="agent-skill-scope-badge"
						>
							<template #leading>
								<N8nIcon :icon="selectedScope.icon" size="small" />
							</template>
							{{ selectedScope.label }}
						</N8nBadge>
					</template>
				</N8nActionDropdown>
			</N8nTooltip>
		</template>
		<template v-if="isFormStep && headerMenuItems.length > 0" #titleSuffix>
			<N8nActionDropdown
				:items="headerMenuItems"
				placement="bottom-start"
				activator-icon="ellipsis"
				activator-size="small"
				data-testid="agent-skill-header-menu"
				@select="onHeaderMenuSelect"
			>
				<template #menuItem="item">
					<span v-if="item.id === 'attach'" :class="$style.menuSwitchRow">
						{{ item.label }}
						<!-- The whole row toggles, so the switch only shows the state. -->
						<N8nSwitch
							:model-value="true"
							:class="$style.menuSwitch"
							tabindex="-1"
							aria-hidden="true"
							data-testid="agent-skill-menu-attach-switch"
						/>
					</span>
					<N8nTooltip
						v-else-if="item.id === 'delete' && data.deleteDisabledReason"
						:content="data.deleteDisabledReason"
						placement="right"
					>
						<span data-testid="agent-skill-menu-delete-reason">{{ item.label }}</span>
					</N8nTooltip>
					<template v-else>{{ item.label }}</template>
				</template>
			</N8nActionDropdown>
		</template>
		<template
			v-if="isFormStep && (showAssistantToggle || showMcpToggle || latestVersion)"
			#headerActions
		>
			<N8nSwitch
				v-if="showAssistantToggle"
				id="skill-assistant-availability"
				v-model="availableToAssistant"
				:label="i18n.baseText('settings.context.skills.assistant.toggle')"
				:disabled="editorLocked"
				data-testid="skill-assistant-availability"
			/>
			<N8nSwitch
				v-if="showMcpToggle"
				id="skill-available-to-mcp"
				v-model="availableToMCP"
				:label="i18n.baseText('settings.context.skills.modal.mcp.toggle')"
				:disabled="editorLocked"
				data-testid="skill-available-to-mcp"
			>
				<template #label="{ label }">
					{{ label }}
					<N8nTooltip :content="i18n.baseText('settings.context.skills.modal.mcp.tooltip')">
						<N8nIcon icon="circle-help" size="small" data-testid="skill-available-to-mcp-help" />
					</N8nTooltip>
				</template>
			</N8nSwitch>
			<N8nButton
				v-if="latestVersion"
				variant="ghost"
				size="small"
				:class="versionsOpen && $style.versionsButtonActive"
				:aria-pressed="versionsOpen"
				:aria-label="i18n.baseText('agents.builder.skills.versions.toggle')"
				data-testid="agent-skill-versions-button"
				@click="versionsOpen = !versionsOpen"
			>
				<template #icon><N8nIcon icon="history" :size="16" /></template>
				{{ versionsButtonLabel }}
			</N8nButton>
		</template>
		<div v-if="hasPicker" v-show="step === 'select'" :class="$style.picker">
			<ToolsConnectionModal
				:open="modalOpen && step === 'select'"
				:items="pickerItems"
				:categories="['all', 'project', 'this-agent', 'global']"
				:category-labels="data.projectLabel ? { project: data.projectLabel } : undefined"
				:detail-item="null"
				:search-placeholder="i18n.baseText('agents.builder.skills.picker.search.placeholder')"
				:empty-message="
					libraryLoading
						? i18n.baseText('agents.builder.skills.picker.loading')
						: i18n.baseText('agents.builder.skills.picker.empty')
				"
				:no-results-message="i18n.baseText('agents.builder.skills.picker.noResults')"
				:create-action="{
					label: i18n.baseText('agents.builder.skills.picker.create'),
					description: i18n.baseText('agents.builder.skills.picker.create.description'),
					testId: 'agent-skill-picker-create',
				}"
				:connect-label="() => i18n.baseText('agents.builder.skills.picker.add')"
				:connect-aria-label="
					(item) =>
						i18n.baseText('agents.builder.skills.picker.addAriaLabel', {
							interpolate: { name: item.title },
						})
				"
				embedded
				show-connect-actions
				hide-empty-categories
				iconless-rows
				persistent-scrollbar
				data-testid="agent-skill-picker"
				@connect="onPickerItemAttach"
				@open-detail="onPickerItemPreview"
				@create="onPickerCreate"
			/>
		</div>
		<div
			v-if="step === 'preview' && previewSkill"
			:class="$style.content"
			data-testid="agent-skill-preview"
		>
			<AgentSkillFileNav
				:skill="previewSkill.skill"
				:selected-path="previewPath"
				read-only
				@select="previewPath = $event"
			/>
			<AgentSkillViewer
				:skill="previewSkill.skill"
				:selected-path="previewPath"
				read-only
				@select:path="previewPath = $event"
			/>
		</div>
		<template v-else-if="step !== 'select'">
			<N8nCallout
				v-if="syncedFrom && step === 'edit'"
				theme="info"
				icon="git-branch"
				:class="[$style.callout, isFormStep && $style.calloutInset]"
				data-testid="agent-skill-synced-banner"
			>
				{{
					i18n.baseText('settings.context.skills.synced.banner', {
						interpolate: { repo: syncedFrom.label },
					})
				}}
			</N8nCallout>
			<N8nCallout
				v-else-if="data.readOnly"
				theme="info"
				:class="[$style.callout, isFormStep && $style.calloutInset]"
				data-testid="agent-skill-read-only-callout"
			>
				{{ i18n.baseText('settings.context.skills.readOnly') }}
			</N8nCallout>
			<N8nCallout
				v-if="openedWithMissingContent && !isReadOnly"
				theme="warning"
				:class="[$style.callout, isFormStep && $style.calloutInset]"
				data-testid="agent-skill-missing-content-callout"
			>
				{{ i18n.baseText('agents.builder.skills.missingContent.callout' as BaseTextKey) }}
			</N8nCallout>
			<N8nCallout
				v-if="accessWarning"
				theme="warning"
				:class="[$style.callout, isFormStep && $style.calloutInset]"
				data-testid="agent-skill-access-warning"
			>
				{{ accessWarning }}
			</N8nCallout>
			<div v-if="comparison" :class="$style.compareBar" data-testid="agent-skill-compare-bar">
				<N8nIcon icon="file-diff" :size="14" />
				<N8nText size="small">
					{{ i18n.baseText('agents.builder.skills.versions.compare.from') }}
				</N8nText>
				<N8nSelect
					:model-value="comparison.from"
					size="small"
					:teleported="false"
					:class="$style.compareSelect"
					data-testid="agent-skill-compare-from"
					@update:model-value="onCompare(Number($event), comparison.to)"
				>
					<N8nOption
						v-for="option in versionOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nText size="small">
					{{ i18n.baseText('agents.builder.skills.versions.compare.to') }}
				</N8nText>
				<N8nSelect
					:model-value="comparison.to"
					size="small"
					:teleported="false"
					:class="$style.compareSelect"
					data-testid="agent-skill-compare-to"
					@update:model-value="onCompare(comparison.from, Number($event))"
				>
					<N8nOption
						v-for="option in versionOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nButton
					variant="outline"
					size="small"
					:class="$style.compareDone"
					data-testid="agent-skill-compare-done"
					@click="leaveCompare"
				>
					{{ i18n.baseText('agents.builder.skills.versions.done') }}
				</N8nButton>
			</div>
			<div
				v-else-if="showPinnedBar && data.agentVersions"
				:class="$style.pinnedBar"
				data-testid="agent-skill-pinned-bar"
			>
				<N8nIcon icon="pin" :size="14" :class="$style.pinnedIcon" />
				<N8nText size="small" :class="$style.pinnedText">
					{{
						i18n.baseText('agents.builder.skills.versions.pinned', {
							interpolate: { agent: data.agentName ?? '', version: data.agentVersions.draft },
						})
					}}
				</N8nText>
				<!-- With the panel open, its Use latest switch does the same. -->
				<N8nButton
					v-if="data.onUseLatestVersion && !versionsOpen"
					variant="outline"
					size="small"
					:class="$style.barAction"
					data-testid="agent-skill-pinned-use-latest"
					@click="onUseLatestVersion"
				>
					{{ i18n.baseText('agents.builder.skills.versions.useLatest') }}
				</N8nButton>
			</div>
			<div
				v-else-if="viewedVersion"
				:class="$style.viewingBar"
				data-testid="agent-skill-viewing-version"
			>
				<N8nIcon icon="history" :size="14" />
				<N8nText size="small">{{ viewingText }}</N8nText>
			</div>
			<div :class="[$style.content, isFormStep && $style.contentFlush]">
				<AgentSkillUpload
					v-if="step === 'upload'"
					v-model:busy="isImporting"
					@uploaded="onSkillUploaded"
					@add-manually="onAddManually"
					@import:skill="onImportSkill"
				/>
				<template v-else-if="comparison && comparedSkill">
					<AgentSkillFileNav
						:class="$style.fileColumn"
						:skill="comparedSkill"
						:selected-path="selectedPath"
						:change-counts="diffCounts"
						read-only
						@select="selectedPath = $event"
					/>
					<SkillVersionDiff
						:class="$style.formColumn"
						:sections="diffSections"
						:selected-path="selectedPath"
					/>
				</template>
				<template v-else>
					<AgentSkillFileNav
						:class="isFormStep && $style.fileColumn"
						:skill="displayedSkill"
						:selected-path="selectedPath"
						:add-reference-disabled="!canAddReference"
						:read-only="editorLocked || !!viewedVersion"
						:invalid-paths="visibleInvalidReferencePaths"
						@add-reference="onAddReference"
						@remove-reference="onRemoveReference"
						@select="selectedPath = $event"
					/>
					<AgentSkillViewer
						:key="viewedVersion?.version ?? 'latest'"
						:class="isFormStep && $style.formColumn"
						:skill="displayedSkill"
						:selected-path="selectedPath"
						:disabled="editorLocked"
						:read-only="(cannotEdit && !isPinned) || !!viewedVersion"
						:errors="visibleErrors"
						:show-validation-warnings="submitted || openedWithMissingContent"
						@select:path="selectedPath = $event"
						@update:skill="onSkillUpdate"
						@update:valid="onValidUpdate"
					>
						<template #fields-start>
							<div ref="nameField">
								<N8nFormInput
									:model-value="skill.name"
									:label="i18n.baseText('agents.builder.skills.name.label')"
									name="skill-name"
									required
									label-size="small"
									:maxlength="128"
									:placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
									:disabled="editorLocked"
									data-testid="agent-skill-name-input"
									@update:model-value="onSkillUpdate({ name: String($event ?? '') })"
								/>
								<N8nText
									v-if="visibleNameError"
									size="small"
									color="danger"
									data-testid="agent-skill-name-error"
								>
									{{ visibleNameError }}
								</N8nText>
							</div>
						</template>
					</AgentSkillViewer>
				</template>
			</div>
		</template>

		<template v-if="showVersionsPanel && versions" #sidePanel>
			<SkillVersionTimeline
				:versions="versions"
				:shown-version="viewedVersion?.version ?? baseVersion"
				:can-restore="canRestore"
				@open="onOpenVersion"
				@restore="restoreVersion"
				@compare="
					onCompare($event, viewedVersion?.version ?? baseVersion ?? versionOptions[0].value)
				"
				:agent="timelineAgent"
				@use="useVersion"
				@use-latest="onUseLatestVersion"
			/>
		</template>

		<template v-if="showRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-skill-remove" @click="onRemove">
				<template #icon
					><N8nIcon :icon="data.skillRefsEnabled ? 'unlink' : 'trash-2'" :size="16"
				/></template>
				{{ removeLabel }}
			</N8nButton>
		</template>
		<template v-else-if="syncedFrom && step === 'edit'" #footerLeft>
			<N8nButton
				variant="ghost"
				:href="syncedFrom?.webUrl"
				target="_blank"
				data-testid="agent-skill-open-in-github"
			>
				<template #icon><N8nIcon icon="external-link" :size="16" /></template>
				{{ i18n.baseText('settings.context.skills.synced.openInGithub') }}
			</N8nButton>
			<N8nButton
				v-if="canStopSyncing"
				variant="ghost"
				:disabled="isSaving || isStoppingSync"
				data-testid="agent-skill-stop-syncing"
				@click="onStopSyncing"
			>
				<template #icon><N8nIcon icon="unlink" :size="16" /></template>
				{{ i18n.baseText('settings.context.skills.stopSyncing.action') }}
			</N8nButton>
		</template>
		<template v-else-if="step === 'select'" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-skill-picker-manage" @click="onManageSkills">
				<template #icon><N8nIcon icon="settings" :size="16" /></template>
				{{ i18n.baseText('agents.builder.skills.picker.manage') }}
			</N8nButton>
		</template>
		<template v-if="footerHint" #footerBeforeCancel>
			<N8nText
				size="small"
				color="text-light"
				:class="$style.footerHint"
				data-testid="agent-skill-footer-hint"
			>
				{{ footerHint }}
			</N8nText>
		</template>
		<template v-if="footerPrimaryAction" #footerActions>
			<N8nButton
				v-if="footerPrimaryAction === 'add'"
				variant="solid"
				data-testid="agent-skill-preview-add"
				@click="onPreviewAdd"
			>
				{{ i18n.baseText('agents.builder.skills.picker.add') }}
			</N8nButton>
			<template v-else-if="footerPrimaryAction === 'viewing' && viewedVersion">
				<N8nButton
					variant="outline"
					data-testid="agent-skill-version-done"
					@click="viewedVersion = null"
				>
					{{ i18n.baseText('agents.builder.skills.versions.done') }}
				</N8nButton>
				<N8nButton
					v-if="timelineAgent && viewedVersion.version !== timelineAgent.draft"
					variant="outline"
					data-testid="agent-skill-version-use"
					@click="useVersion(viewedVersion.version)"
				>
					{{
						i18n.baseText('agents.builder.skills.versions.useVersionIn', {
							interpolate: { version: viewedVersion.version, agent: timelineAgent.name },
						})
					}}
				</N8nButton>
				<!-- The latest version needs no restore: saving it again makes no new version. -->
				<N8nButton
					v-if="canRestore && viewedVersion.version !== versions?.[0]?.version"
					variant="solid"
					:loading="isSaving"
					data-testid="agent-skill-version-restore"
					@click="restoreVersion(viewedVersion.version)"
				>
					{{ i18n.baseText('agents.builder.skills.versions.restore') }}
				</N8nButton>
			</template>
			<N8nButton
				v-else-if="footerPrimaryAction === 'useLatest'"
				variant="solid"
				data-testid="agent-skill-use-latest"
				@click="onUseLatestVersion"
			>
				{{ i18n.baseText('agents.builder.skills.useLatest') }}
			</N8nButton>
			<N8nButton
				v-else
				variant="solid"
				:disabled="!hasChanges || defaultNameLoading || !!accessWarning || isPinned"
				:loading="isSaving"
				data-testid="agent-skill-create-save"
				@click="onSave"
			>
				{{ i18n.baseText('agents.builder.skills.save') }}
			</N8nButton>
		</template>
	</AgentModalMultiStep>
</template>

<style module>
.content {
	/* The Design System has no width preset between 2xlarge and full. */
	width: min(52rem, calc(100dvw - var(--spacing--lg) * 3));
	display: flex;
	gap: var(--spacing--lg);
}

.picker {
	width: min(calc(52rem - var(--spacing--lg) * 2), calc(100dvw - var(--spacing--lg) * 5));
	height: 100%;
}

.callout {
	margin-bottom: var(--spacing--md);
}

/* The header menu, as the design: grey icons and check mark, a red Delete when it is allowed. */
.menuItem :global(svg) {
	color: var(--color--text--tint-1);
}

.deleteItem:not([data-disabled]) {
	color: var(--color--danger);
}

.menuSwitchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
}

.menuSwitch {
	pointer-events: none;
}

/* A pinned skill: a warning strip over the file list and the form, as the design does. */
.pinnedBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--lg);
	min-height: var(--spacing--xl);
	border-bottom: var(--border-width) var(--border-style) var(--callout--border-color--warning);
	background-color: var(--callout--color--background--warning);
}

.pinnedIcon {
	flex-shrink: 0;
	color: var(--callout--icon-color--warning);
}

.pinnedText {
	color: var(--callout--color--text--warning);
}

.barAction {
	margin-left: auto;
}

/* A full-width strip under the header, as the body of the form steps is flush. */
.viewingBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--lg);
	border-bottom: var(--border);
	background-color: var(--color--background--light-2);
	color: var(--color--text--shade-1);
}

.compareBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--lg);
	border-bottom: var(--border);
	background-color: var(--color--background--light-2);
}

.compareSelect {
	width: calc(var(--spacing--3xl) + var(--spacing--xs));
}

.compareDone {
	margin-left: auto;
}

.versionsButtonActive {
	background-color: var(--background--active);
}

/* The form steps have a flush body, so their callouts keep the body inset themselves. */
.calloutInset {
	margin: var(--spacing--md) var(--spacing--lg) 0;
}

/* The file list runs to the edges of the modal and each column keeps its own inset. The modal has
   a fixed size on these steps, so the columns fill it, beside the Versions panel or not. */
.contentFlush {
	gap: 0;
	align-items: stretch;
	width: auto;
	flex: 1;
}

/* Nested, so it wins over the file list's own background. */
.contentFlush .fileColumn {
	background-color: var(--background--subtle);
}

.formColumn {
	flex: 1;
	padding: var(--spacing--md) var(--spacing--lg);
}

.footerHint {
	text-align: right;
}

/* Geist sits high in its line box, as in the Settings scope badge. */
.scopeBadge > :global(.n8n-text) {
	line-height: 1;
	padding-block: var(--spacing--5xs);
}

@media (max-width: 480px) {
	.content {
		flex-direction: column;
	}
}
</style>
