<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	skillNameKey,
	type AgentSkillAvailability,
	type SkillCreateMethod,
	type SkillDetail,
	type SkillListItem,
	type SkillUsage,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSwitch,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	SkillConnectionItem,
	ToolCategoryKey,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import { getHubSkill, listAttachableSkills } from '../composables/useAgentApi';
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
	hubSkillsEnabled?: boolean;
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
	/**
	 * A default name that no skill in the scope has yet, as new workflows get one. Called
	 * when the user starts a skill by hand, with the Settings scope value or, in the agent
	 * builder, the "available to" value.
	 */
	getDefaultName?: (scope: string) => Promise<string>;
	/** Locks the scope field and explains why in a tooltip. */
	scopeLockedReason?: string;
	/** Settings only: the agents that use the skill, to warn about a scope that drops them. */
	usedBy?: SkillUsage;
	/** Shows the skill without edit controls, for a user who can use but not change it. */
	readOnly?: boolean;
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
const uiStore = useUIStore();
const router = useRouter();
const rootStore = useRootStore();
const { showError } = useToast();
const agentTelemetry = useAgentTelemetry();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const agentModal = useTemplateRef<InstanceType<typeof AgentModalMultiStep>>('agentModal');

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

const initialSkill = normalizeSkill({
	name: props.data.skill?.name ?? getDefaultSkillName(),
	description: props.data.skill?.description ?? '',
	instructions: props.data.skill?.instructions ?? '',
	...(props.data.skill?.references ? { references: props.data.skill.references } : {}),
});
const skill = ref<AgentSkill>(cloneDeep(initialSkill));
const submitted = ref(false);
const formIsValid = ref(false);
const selectedPath = ref(SKILL_FILE);
const isEditing = computed(() => !!props.data.skillId);
// An upload lands on the edit step like a saved skill does, so the step alone cannot tell.
const createMethod = ref<SkillCreateMethod>('manual');
const hasPicker = !props.data.skillId && !!props.data.hubSkillsEnabled && !!props.data.onAttach;
const step = ref<'select' | 'preview' | 'upload' | 'manual' | 'edit'>(
	props.data.skill || props.data.skillId ? 'edit' : hasPicker ? 'select' : 'upload',
);
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
const selectedScopeIcon = computed(
	() => props.data.scopeOptions?.find((option) => option.value === scope.value)?.icon,
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
	return step.value === 'preview' ? previewIsAdded.value : isEditing.value;
});
const footerPrimaryAction = computed<'add' | 'save' | 'useLatest' | undefined>(() => {
	if (step.value === 'select') return undefined;
	if (step.value === 'preview') return previewIsAdded.value ? undefined : 'add';
	if (isOutdated.value) return props.data.onUseLatestVersion ? 'useLatest' : undefined;
	return isReadOnly.value ? undefined : 'save';
});
const modalTitle = computed(() => {
	if (step.value === 'select') return i18n.baseText('agents.builder.skills.title');
	if (step.value === 'upload') return i18n.baseText('agents.builder.skills.add');
	if (step.value === 'preview') return previewSkill.value?.name ?? '';
	return skill.value.name;
});

const skillAccess = ref<SkillDetail | null>(null);
const skillAccessLoading = ref(false);
const skillAccessFailed = ref(false);
const isOutdated = computed(() => isEditing.value && !!props.data.outdated);
const isReadOnly = computed(
	() =>
		props.data.readOnly === true ||
		skillAccessLoading.value ||
		skillAccessFailed.value ||
		skillAccess.value?.canEdit === false ||
		isOutdated.value,
);
const cannotEdit = computed(
	() => props.data.readOnly === true || skillAccess.value?.canEdit === false || isOutdated.value,
);
/** Save sends a snapshot, so the editor is locked until the answer comes back. */
const editorLocked = computed(() => isReadOnly.value || isSaving.value);
const savedTarget = computed<AgentSkillAvailability | undefined>(() => {
	if (!skillAccess.value) return undefined;
	if (skillAccess.value.agentId) return 'agent';
	return skillAccess.value.scope === 'instance' ? 'instance' : 'project';
});
const showAvailabilitySelect = computed(() => {
	if (!props.data.hubSkillsEnabled || step.value === 'preview') return false;
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
/** Where a changed scope or "available to" field moves the skill, with its label and users. */
const pendingMove = computed<
	{ target: SkillMoveTarget; destination: string; usage: SkillUsage } | undefined
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
	props.data.hubSkillsEnabled
		? i18n.baseText('agents.builder.skills.detach')
		: i18n.baseText('agents.builder.skills.remove'),
);
const footerHint = computed(() => {
	const shownSkill = step.value === 'preview' ? previewSkill.value : skillAccess.value;
	if (step.value === 'edit' && isOutdated.value) {
		return i18n.baseText('agents.builder.skills.hint.outdated');
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
	} else if (description.length > 512) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionMaxLength');
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
		!isEqual(skill.value, initialSkill) ||
		assistantAvailabilityChanged.value ||
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
		skillAccess.value = await getHubSkill(rootStore.restApiContext, skillId);
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
		previewSkill.value = await getHubSkill(rootStore.restApiContext, item.skillId);
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
	if (props.data.skillId && props.data.hubSkillsEnabled) void loadSkillAccess(props.data.skillId);
});

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
	isSaving.value = true;
	let result: AgentSkillConfirmResult;
	try {
		result = await props.data.onConfirm({
			id: props.data.skillId,
			skill: payload,
			...(showAvailabilitySelect.value && targetChanged ? { availableTo: availableTo.value } : {}),
			...(canChangeScope.value ? { scope: scope.value } : {}),
			...(assistantAvailabilityChanged.value
				? { availableToAssistant: availableToAssistant.value }
				: {}),
			...(isEditing.value ? {} : { method: createMethod.value }),
		});
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

async function focusName() {
	await nextTick();
	agentModal.value?.focusTitle();
}

// A new skill gets its name first, so the name takes the focus when it can be edited.
watch(step, async (next) => {
	if ((next === 'manual' || next === 'edit') && !isEditing.value && !isReadOnly.value) {
		await focusName();
	}
});

function onUseLatestVersion() {
	if (!props.data.skillId) return;
	const skillId = props.data.skillId;
	closeModal();
	props.data.onUseLatestVersion?.(skillId);
}

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
		ref="agentModal"
		:open="modalOpen"
		:step="step"
		:title="modalTitle"
		:title-placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
		:title-max-length="128"
		:title-error="visibleNameError"
		:editable-title="step === 'manual' || (step === 'edit' && !isReadOnly)"
		:show-back="step === 'manual' || step === 'preview' || (step === 'upload' && hasPicker)"
		:show-footer="step === 'select' || step === 'manual' || step === 'edit' || step === 'preview'"
		:show-cancel="step !== 'select'"
		:busy="isImporting || previewLoading || isSaving"
		size="fit"
		data-testid="agent-skill-modal"
		@update:open="!$event && closeModal()"
		@update:title="onSkillUpdate({ name: $event })"
		@back="onBack"
	>
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
				v-if="data.readOnly"
				theme="info"
				:class="$style.callout"
				data-testid="agent-skill-read-only-callout"
			>
				{{ i18n.baseText('settings.context.skills.readOnly') }}
			</N8nCallout>
			<N8nCallout
				v-if="openedWithMissingContent && !isReadOnly"
				theme="warning"
				:class="$style.callout"
				data-testid="agent-skill-missing-content-callout"
			>
				{{ i18n.baseText('agents.builder.skills.missingContent.callout' as BaseTextKey) }}
			</N8nCallout>
			<div :class="$style.content">
				<AgentSkillUpload
					v-if="step === 'upload'"
					v-model:busy="isImporting"
					@uploaded="onSkillUploaded"
					@add-manually="onAddManually"
					@import:skill="onImportSkill"
				/>
				<template v-else>
					<AgentSkillFileNav
						:skill="skill"
						:selected-path="selectedPath"
						:add-reference-disabled="!canAddReference"
						:read-only="editorLocked"
						:invalid-paths="visibleInvalidReferencePaths"
						@add-reference="onAddReference"
						@remove-reference="onRemoveReference"
						@select="selectedPath = $event"
					/>
					<AgentSkillViewer
						:skill="skill"
						:selected-path="selectedPath"
						:disabled="editorLocked"
						:read-only="cannotEdit"
						:errors="visibleErrors"
						:show-validation-warnings="submitted || openedWithMissingContent"
						@select:path="selectedPath = $event"
						@update:skill="onSkillUpdate"
						@update:valid="onValidUpdate"
					>
						<template v-if="showScope || showAvailabilitySelect" #fields-start>
							<div :class="$style.scopeField">
								<N8nInputLabel
									v-if="showScope"
									:label="i18n.baseText('settings.context.skills.modal.scope.label')"
									:tooltip-text="i18n.baseText('settings.context.skills.modal.scope.tooltip')"
									size="small"
									data-testid="agent-skill-scope"
								>
									<N8nTooltip
										:disabled="!data.scopeLockedReason"
										:content="data.scopeLockedReason"
										placement="top"
									>
										<!-- A disabled select drops pointer events, so the tooltip needs its own target. -->
										<div>
											<N8nSelect
												v-model="scope"
												size="large"
												:disabled="!canChangeScope || isSaving"
												:teleported="false"
												data-testid="agent-skill-scope-select"
											>
												<template v-if="selectedScopeIcon" #prefix>
													<N8nIcon :icon="selectedScopeIcon" />
												</template>
												<N8nOption
													v-for="option in data.scopeOptions"
													:key="option.value"
													:value="option.value"
													:label="option.label"
												>
													<span :class="$style.availabilityOption">
														<N8nIcon :icon="option.icon" />
														<span>{{ option.label }}</span>
													</span>
												</N8nOption>
											</N8nSelect>
										</div>
									</N8nTooltip>
								</N8nInputLabel>
								<N8nInputLabel
									v-else
									:label="i18n.baseText('agents.builder.skills.availableTo.label')"
									:tooltip-text="i18n.baseText('agents.builder.skills.availableTo.tooltip')"
									show-tooltip
									size="small"
								>
									<N8nSelect
										v-model="availableTo"
										:teleported="false"
										data-testid="agent-skill-availability-select"
									>
										<template #prefix>
											<N8nIcon
												:icon="AVAILABILITY_ICONS[availableTo]"
												:size="16"
												color="text-dark"
											/>
										</template>
										<N8nOption
											v-for="option in availabilityOptions"
											:key="option.value"
											:value="option.value"
											:label="option.label"
										>
											<span :class="$style.availabilityOption">
												<N8nIcon :icon="AVAILABILITY_ICONS[option.value]" :size="16" />
												{{ option.label }}
											</span>
										</N8nOption>
									</N8nSelect>
								</N8nInputLabel>
								<N8nCallout
									v-if="accessWarning"
									theme="warning"
									slim
									data-testid="agent-skill-access-warning"
								>
									{{ accessWarning }}
								</N8nCallout>
							</div>
							<N8nInputLabel
								v-if="showScope && showAssistantAvailability"
								input-name="skill-assistant-availability"
								:label="i18n.baseText('settings.context.skills.assistant.label')"
								:tooltip-text="i18n.baseText('settings.context.skills.assistant.tooltip')"
								size="small"
							>
								<N8nSwitch
									id="skill-assistant-availability"
									v-model="availableToAssistant"
									:aria-label="i18n.baseText('settings.context.skills.assistant.label')"
									:disabled="editorLocked"
									data-testid="skill-assistant-availability"
								/>
							</N8nInputLabel>
						</template>
					</AgentSkillViewer>
				</template>
			</div>
		</template>

		<template v-if="showRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-skill-remove" @click="onRemove">
				<template #icon
					><N8nIcon :icon="data.hubSkillsEnabled ? 'unlink' : 'trash-2'" :size="16"
				/></template>
				{{ removeLabel }}
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
				:disabled="!hasChanges || defaultNameLoading || !!accessWarning"
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

.footerHint {
	text-align: right;
}

.scopeField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.availabilityOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

@media (max-width: 480px) {
	.content {
		flex-direction: column;
	}
}
</style>
