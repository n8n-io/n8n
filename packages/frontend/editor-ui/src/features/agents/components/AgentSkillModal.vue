<script setup lang="ts">
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	skillNameKey,
	type AgentSkillAvailability,
	type SkillCreateMethod,
	type SkillDetail,
	type SkillListItem,
	type SkillVersionSummary,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionDropdown,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem, IconName, KeyboardShortcut } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { UnexpectedError } from 'n8n-workflow';

import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	SkillConnectionItem,
	ToolCategoryKey,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import { getHubSkill, listAttachableSkills } from '../composables/useAgentApi';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentSkill } from '../types';
import { normalizeAgentSkillForSave } from '../utils/agentSkill';
import AgentSkillFileNav from './AgentSkillFileNav.vue';
import AgentSkillUpload from './AgentSkillUpload.vue';
import AgentSkillViewer from './AgentSkillViewer.vue';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';
import SkillVersionCompare, {
	type SkillCompareTarget,
} from './skillVersions/SkillVersionCompare.vue';
import SkillVersionNameDialog from './skillVersions/SkillVersionNameDialog.vue';
import SkillVersionTimeline from './skillVersions/SkillVersionTimeline.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillModalScopeOption = { value: string; label: string; icon: IconName };

/** What a failed `onConfirm` returns. The modal stays open and shows `nameError` on the name. */
export type AgentSkillConfirmFailure = { saved: false; nameError?: string };

/** A save that worked. `created: false` tells a versioned modal that no new version was made. */
export type AgentSkillConfirmSuccess = { saved: true; created?: boolean };

/** `undefined` closes the modal. A callback without a `return` gives it. */
export type AgentSkillConfirmResult =
	| AgentSkillConfirmFailure
	| AgentSkillConfirmSuccess
	| undefined;

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
	/**
	 * A default name that no skill in the scope has yet, as new workflows get one. Called
	 * when the user starts a skill by hand, with the Settings scope value or, in the agent
	 * builder, the "available to" value.
	 */
	getDefaultName?: (scope: string) => Promise<string>;
	/** Locks the scope field and explains why in a tooltip. */
	scopeLockedReason?: string;
	/** Shows the skill without edit controls, for a user who can use but not change it. */
	readOnly?: boolean;
	/**
	 * Shows the versions of a saved hub skill: Save in the header, the timeline and compare.
	 * A save then keeps the modal open and reloads the skill, so `onConfirm` must settle
	 * after the save lands. Needs `skillId`.
	 */
	versioned?: boolean;
	/** With `versioned`: opens the timeline, or compares the two newest versions. */
	initialVersionView?: 'timeline' | 'compare';
	/**
	 * Called on Save. A promise keeps the modal open until it settles. It closes unless the
	 * result is an `AgentSkillConfirmFailure`, so a refused save keeps what the user typed.
	 */
	onConfirm: (payload: {
		id?: string;
		skill: AgentSkill;
		availableTo?: AgentSkillAvailability;
		scope?: string;
		/** Set on create only: whether the user typed the skill or uploaded it. */
		method?: SkillCreateMethod;
		/** With `versioned`: names the new version ("Save with a name", or a restore). */
		label?: string;
		/** With `versioned`: the hash of the latest version that the modal shows. */
		baseSkillHash?: string;
	}) => AgentSkillConfirmResult | Promise<AgentSkillConfirmResult>;
	/** The draft is pinned to a version older than the latest one. The modal is read-only. */
	outdated?: boolean;
	/** With `versioned` and `outdated`: the version the draft runs, which the editor shows. */
	pinnedVersion?: number;
	/** Makes the agent follow the latest version again ("Follow latest"). */
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
const skillsStore = useSkillsStore();
const { showError, showMessage } = useToast();
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

/** The skill as the editor holds it, so a saved skill and the edits compare equal. */
function toEditorSkill(source: AgentSkill | undefined): AgentSkill {
	return normalizeSkill({
		name: source?.name ?? getDefaultSkillName(),
		description: source?.description ?? '',
		instructions: source?.instructions ?? '',
		...(source?.references ? { references: source.references } : {}),
	});
}

/** What the last save left. Edits compare with it, and a versioned save moves it on. */
const savedSkill = ref<AgentSkill>(toEditorSkill(props.data.skill));
const skill = ref<AgentSkill>(cloneDeep(savedSkill.value));
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
const savedScope = ref(props.data.initialScope);

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
	if (isOutdated.value) {
		// The pinned callout has its own "Use latest".
		if (pinnedBehindLatest.value) return undefined;
		return props.data.onUseLatestVersion ? 'useLatest' : undefined;
	}
	// A versioned skill saves from the header.
	if (showVersions.value) return undefined;
	return isReadOnly.value ? undefined : 'save';
});
const modalTitle = computed(() => {
	if (step.value === 'select') return i18n.baseText('agents.builder.skills.title');
	if (step.value === 'upload') return i18n.baseText('agents.builder.skills.add');
	if (step.value === 'preview') return previewSkill.value?.name ?? '';
	return displayedSkill.value.name;
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
/** An existing skill opens to read or edit it, so the footer closes it rather than cancels. */
const cancelLabel = computed(() =>
	isEditing.value && step.value === 'edit'
		? i18n.baseText('generic.close')
		: i18n.baseText('generic.cancel'),
);
const cannotEdit = computed(
	() => props.data.readOnly === true || skillAccess.value?.canEdit === false || isOutdated.value,
);
/** Save sends a snapshot, so the editor is locked until the answer comes back. */
const editorLocked = computed(() => isReadOnly.value || isSaving.value || !!viewing.value);
const savedTarget = computed<AgentSkillAvailability | undefined>(() => {
	if (!skillAccess.value) return undefined;
	if (skillAccess.value.agentId) return 'agent';
	return skillAccess.value.scope === 'instance' ? 'instance' : 'project';
});
const usedByOtherAgents = computed(() => {
	const usage = skillAccess.value?.usedBy;
	if (!usage) return false;
	const isOtherAgent = ({ agentId }: { agentId: string }) => agentId !== props.data.agentId;
	return usage.hiddenAgents > 0 || usage.drafts.some(isOtherAgent) || usage.pins.some(isOtherAgent);
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
const removeLabel = computed(() =>
	props.data.hubSkillsEnabled
		? i18n.baseText('agents.builder.skills.detach')
		: i18n.baseText('agents.builder.skills.remove'),
);
const footerHint = computed(() => {
	const shownSkill = step.value === 'preview' ? previewSkill.value : skillAccess.value;
	if (step.value === 'edit' && isOutdated.value) {
		// The pinned callout already says it.
		return pinnedBehindLatest.value ? '' : i18n.baseText('agents.builder.skills.hint.outdated');
	}
	if (!shownSkill || (step.value !== 'preview' && step.value !== 'edit')) return '';
	// The read-only callout already says it.
	if (step.value === 'edit' && props.data.readOnly) return '';
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

const visibleErrors = computed(() =>
	submitted.value || openedWithMissingContent.value ? validationErrors.value : {},
);
const visibleNameError = computed(
	() => (submitted.value ? validationErrors.value.name : undefined) ?? serverNameError.value,
);
const canSave = computed(
	() => formIsValid.value && !validationErrors.value.name && !isReadOnly.value,
);
const hasContentChanges = computed(() => !isEqual(skill.value, savedSkill.value));
const hasChanges = computed(
	() =>
		!isEditing.value ||
		hasContentChanges.value ||
		(showAvailabilitySelect.value && availableTo.value !== savedTarget.value) ||
		(canChangeScope.value && scope.value !== savedScope.value),
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

function onPickerItemDetach(item: ToolConnectionItem) {
	if (item.kind !== 'skill' || !item.attached || item.attaching) return;
	props.data.onRemove?.(item.skillId);
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

onMounted(async () => {
	if (hasPicker) void loadLibrarySkills();
	if (props.data.skillId && (props.data.hubSkillsEnabled || props.data.versioned)) {
		void loadSkillAccess(props.data.skillId);
	}
	if (showVersions.value) await openInitialVersionView();
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
	if (isReadOnly.value || viewing.value) return;
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

/**
 * Saves the edits. A restore passes the content of an older version instead, which was
 * valid when it was saved, so it skips the form checks.
 */
async function onSave(options: { label?: string; restored?: AgentSkill } = {}) {
	if (defaultNameLoading.value || isSaving.value) return;
	if (!options.restored) {
		submitted.value = true;
		if (!canSave.value) return;
	}

	const source = options.restored ?? skill.value;
	const payload = normalizeSkill({
		name: source.name.trim(),
		description: source.description.trim(),
		instructions: source.instructions,
		...(source.references ? { references: source.references } : {}),
	});

	const targetChanged = !isEditing.value || availableTo.value !== savedTarget.value;
	const baseSkillHash = skillAccess.value?.skillHash;
	isSaving.value = true;
	let result: AgentSkillConfirmResult;
	try {
		result = await props.data.onConfirm({
			id: props.data.skillId,
			skill: payload,
			...(showAvailabilitySelect.value && targetChanged ? { availableTo: availableTo.value } : {}),
			...(canChangeScope.value ? { scope: scope.value } : {}),
			...(isEditing.value ? {} : { method: createMethod.value }),
			...(showVersions.value && options.label ? { label: options.label } : {}),
			...(showVersions.value && baseSkillHash ? { baseSkillHash } : {}),
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
	if (showVersions.value) {
		await afterVersionSave(payload, result?.created !== false);
		return;
	}
	closeModal();
}

// ---- Versions of a saved hub skill ----

const showVersions = computed(
	() => !!props.data.versioned && isEditing.value && step.value === 'edit',
);
/** Save, name and restore. Read-only users still see the timeline and compare. */
const canWriteVersions = computed(() => showVersions.value && !cannotEdit.value);

const versions = ref<SkillVersionSummary[]>([]);
const versionsLoading = ref(false);
const timelineOpen = ref(false);
const viewing = ref<{ version: number; skill: AgentSkill } | null>(null);
const compare = ref<{ from: SkillCompareTarget; to: SkillCompareTarget } | null>(null);
const nameDialog = ref<'name' | 'saveWithName' | null>(null);
const namingVersion = ref(false);
/** Saved versions never change, so their content loads once. */
const versionContents = new Map<number, AgentSkill>();

const latestVersion = computed(
	() => versions.value[0]?.version ?? skillAccess.value?.latestVersion ?? 0,
);
const latestVersionLabel = computed(() =>
	versions.value.length > 0
		? versions.value[0].label
		: (skillAccess.value?.latestVersionLabel ?? null),
);
/** The version the edits start from. A pinned draft shows its pinned version. */
const baseVersion = computed(() =>
	isOutdated.value && props.data.pinnedVersion ? props.data.pinnedVersion : latestVersion.value,
);
/** What the file list and the editor show: an older version, or the edits. */
const displayedSkill = computed(() => viewing.value?.skill ?? skill.value);
/**
 * The draft of this agent runs a version older than the latest one. Known from the props,
 * so the footer does not change when the versions load.
 */
const pinnedBehindLatest = computed(
	() => showVersions.value && isOutdated.value && !!props.data.pinnedVersion,
);
/** The pinned callout gives way to the views of another version or a compare. */
const showPinnedCallout = computed(
	() =>
		pinnedBehindLatest.value &&
		latestVersion.value > baseVersion.value &&
		!viewing.value &&
		!compare.value,
);
/** "v9" or "v9 · Worldwide refunds". The Save button already says whether it is saved. */
const versionStatus = computed(() => {
	if (pinnedBehindLatest.value) {
		// The pinned callout says it, so the header does not repeat it.
		if (showPinnedCallout.value) return '';
		return i18n.baseText('settings.context.skills.versions.statusPinned', {
			interpolate: { version: String(baseVersion.value), latest: String(latestVersion.value) },
		});
	}
	return versionName(latestVersion.value, latestVersionLabel.value);
});
const unsavedSkill = computed(() => (hasContentChanges.value ? skill.value : null));

function versionName(
	version: number,
	label = versions.value.find((summary) => summary.version === version)?.label,
): string {
	const short = i18n.baseText('settings.context.skills.versions.number', {
		interpolate: { version: String(version) },
	});
	return label ? `${short} · ${label}` : short;
}

async function loadVersions() {
	if (!props.data.skillId) return;
	versionsLoading.value = true;
	try {
		versions.value = await skillsStore.fetchSkillVersions(props.data.skillId);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.versions.timeline.error'));
	} finally {
		versionsLoading.value = false;
	}
}

async function loadVersion(version: number): Promise<AgentSkill> {
	const cached = versionContents.get(version);
	if (cached) return cached;
	if (!props.data.skillId) throw new UnexpectedError('A versioned skill needs an id');
	const { skill: content } = await skillsStore.fetchSkillVersion(props.data.skillId, version);
	const editorSkill = toEditorSkill(content);
	versionContents.set(version, editorSkill);
	return editorSkill;
}

async function openInitialVersionView() {
	await loadVersions();
	if (props.data.initialVersionView === 'timeline') {
		timelineOpen.value = true;
	} else if (props.data.initialVersionView === 'compare') {
		const [newest, previous] = versions.value;
		if (newest) compare.value = { from: (previous ?? newest).version, to: newest.version };
	}
}

function toggleTimeline() {
	timelineOpen.value = !timelineOpen.value;
	if (timelineOpen.value && versions.value.length === 0) void loadVersions();
}

function closeTimeline() {
	timelineOpen.value = false;
	viewing.value = null;
}

async function onSelectVersion(version: number) {
	compare.value = null;
	if (version === baseVersion.value) {
		viewing.value = null;
		return;
	}
	try {
		viewing.value = { version, skill: await loadVersion(version) };
		selectedPath.value = SKILL_FILE;
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.versions.loadError'));
	}
}

function openCompare(from: SkillCompareTarget, to: SkillCompareTarget) {
	viewing.value = null;
	compare.value = { from, to };
}

/** Saves the content of the version on screen as the next version. */
async function onRestore() {
	if (!viewing.value || !canWriteVersions.value) return;
	const { version, skill: content } = viewing.value;
	await onSave({
		restored: content,
		label: i18n.baseText('settings.context.skills.versions.restore.label', {
			interpolate: { version: String(version) },
		}),
	});
}

async function afterVersionSave(saved: AgentSkill, created: boolean) {
	viewing.value = null;
	compare.value = null;
	submitted.value = false;
	savedScope.value = scope.value;
	savedSkill.value = cloneDeep(saved);
	skill.value = cloneDeep(saved);
	await Promise.all([refreshSkillAccess(), loadVersions()]);
	if (!created) return;
	showMessage({
		title: i18n.baseText('settings.context.skills.versions.saved.toast', {
			interpolate: { version: String(latestVersion.value) },
		}),
		message: i18n.baseText('settings.context.skills.versions.saved.toastDescription', {
			interpolate: { version: String(latestVersion.value) },
		}),
		type: 'success',
	});
}

/** Reads the saved skill again without locking the editor, for the next save's hash. */
async function refreshSkillAccess() {
	if (!props.data.skillId) return;
	try {
		const detail = await getHubSkill(rootStore.restApiContext, props.data.skillId);
		skillAccess.value = detail;
		// The server can store the content in another form. The edits start from it.
		const stored = toEditorSkill(detail.skill);
		if (isEqual(skill.value, savedSkill.value)) skill.value = cloneDeep(stored);
		savedSkill.value = stored;
	} catch {
		// The next save answers with a conflict if the hash is out of date.
	}
}

async function onNameVersion(label: string | null) {
	if (nameDialog.value === 'saveWithName') {
		nameDialog.value = null;
		await onSave({ label: label ?? undefined });
		return;
	}
	if (!props.data.skillId || latestVersion.value === 0) return;
	const version = latestVersion.value;
	namingVersion.value = true;
	try {
		const updated = await skillsStore.updateSkillVersionLabel(props.data.skillId, version, label);
		versions.value = versions.value.map((summary) =>
			summary.version === updated.version ? updated : summary,
		);
		nameDialog.value = null;
		showMessage({
			title: i18n.baseText(
				label
					? 'settings.context.skills.versions.nameDialog.success'
					: 'settings.context.skills.versions.nameDialog.removed',
				{ interpolate: { version: String(version) } },
			),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.versions.nameDialog.error'));
	} finally {
		namingVersion.value = false;
	}
}

const canSaveVersion = computed(
	() =>
		canWriteVersions.value &&
		hasChanges.value &&
		!isReadOnly.value &&
		!isSaving.value &&
		!defaultNameLoading.value,
);

// Save is the button and the timeline is the clock icon, so the menu holds the rest.
type VersionAction = 'review' | 'name';

const SAVE_SHORTCUT = { metaKey: true, keys: ['S'] } satisfies KeyboardShortcut;

const versionMenuItems = computed<Array<ActionDropdownItem<VersionAction>>>(() => [
	{
		id: 'review',
		label: i18n.baseText('settings.context.skills.versions.menu.review'),
		disabled: !hasContentChanges.value || latestVersion.value === 0,
	},
	{
		id: 'name',
		label: i18n.baseText(
			hasChanges.value
				? 'settings.context.skills.versions.menu.saveWithName'
				: 'settings.context.skills.versions.menu.name',
		),
		disabled: hasChanges.value ? !canSaveVersion.value : latestVersion.value === 0,
	},
]);

function onVersionMenuSelect(action: VersionAction) {
	switch (action) {
		case 'review':
			openCompare(latestVersion.value, 'unsaved');
			break;
		case 'name':
			nameDialog.value = hasChanges.value ? 'saveWithName' : 'name';
			break;
	}
}

// Cmd+S or Ctrl+S saves a new version, also from inside the editor. The capture phase runs
// before inputs that stop the event.
useEventListener(
	document,
	'keydown',
	(event: KeyboardEvent) => {
		if (!modalOpen.value || !canWriteVersions.value || nameDialog.value) return;
		if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
		event.preventDefault();
		if (canSaveVersion.value) void onSave();
	},
	{ capture: true },
);

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
		:editable-title="step === 'manual' || (step === 'edit' && !isReadOnly && !viewing && !compare)"
		:show-back="step === 'manual' || step === 'preview' || (step === 'upload' && hasPicker)"
		:show-footer="step === 'select' || step === 'manual' || step === 'edit' || step === 'preview'"
		:show-cancel="step !== 'select'"
		:cancel-label="cancelLabel"
		:body-flush="step !== 'select'"
		:busy="isImporting || previewLoading || isSaving"
		size="fit"
		data-testid="agent-skill-modal"
		@update:open="!$event && closeModal()"
		@update:title="onSkillUpdate({ name: $event })"
		@back="onBack"
	>
		<template v-if="showVersions" #headerActions>
			<div :class="$style.versionHeader">
				<N8nText
					v-if="latestVersion > 0 && versionStatus"
					size="small"
					color="text-light"
					:class="$style.versionStatus"
					data-testid="skill-version-status"
				>
					{{ versionStatus }}
				</N8nText>
				<N8nTooltip :content="i18n.baseText('settings.context.skills.versions.timeline.open')">
					<N8nIconButton
						variant="ghost"
						icon="history"
						:aria-label="i18n.baseText('settings.context.skills.versions.timeline.open')"
						:aria-pressed="timelineOpen"
						data-testid="skill-version-timeline-toggle"
						@click="toggleTimeline"
					/>
				</N8nTooltip>
				<div v-if="canWriteVersions" :class="$style.buttonGroup">
					<KeyboardShortcutTooltip
						:label="i18n.baseText('settings.context.skills.versions.save.tooltip')"
						:shortcut="SAVE_SHORTCUT"
						placement="bottom"
						:disabled="!canSaveVersion"
					>
						<N8nButton
							:class="$style.groupButtonLeft"
							variant="ghost"
							:disabled="!canSaveVersion"
							:loading="isSaving"
							data-testid="skill-version-save"
							@click="onSave()"
						>
							<span :class="$style.saveLabel">
								<N8nStatusDot
									v-if="hasChanges"
									variant="warning"
									data-testid="skill-version-dirty"
								/>
								{{
									i18n.baseText(
										hasChanges
											? 'settings.context.skills.versions.save'
											: 'settings.context.skills.versions.saved',
									)
								}}
							</span>
						</N8nButton>
					</KeyboardShortcutTooltip>
					<N8nActionDropdown
						:items="versionMenuItems"
						placement="bottom-end"
						:teleported="false"
						data-testid="skill-version-menu"
						@select="onVersionMenuSelect"
					>
						<template #activator>
							<N8nIconButton
								:class="$style.groupButtonRight"
								variant="ghost"
								icon="chevron-down"
								:aria-label="i18n.baseText('settings.context.skills.versions.menu.label')"
								data-testid="skill-version-menu-button"
							/>
						</template>
					</N8nActionDropdown>
				</div>
			</div>
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
				embedded
				show-connect-actions
				persistent-scrollbar
				data-testid="agent-skill-picker"
				@connect="onPickerItemAttach"
				@disconnect="onPickerItemDetach"
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
			<N8nCallout
				v-if="showVersions && viewing && !compare"
				theme="secondary"
				icon="eye"
				:class="$style.callout"
				data-testid="skill-version-viewing"
			>
				{{
					i18n.baseText('settings.context.skills.versions.viewing', {
						interpolate: { version: versionName(viewing.version) },
					})
				}}
				<template #trailingContent>
					<div :class="$style.calloutActions">
						<N8nButton
							variant="outline"
							size="small"
							data-testid="skill-version-viewing-compare"
							@click="openCompare(viewing.version, latestVersion)"
						>
							{{ i18n.baseText('settings.context.skills.versions.viewing.compare') }}
						</N8nButton>
						<N8nButton
							variant="outline"
							size="small"
							data-testid="skill-version-viewing-back"
							@click="viewing = null"
						>
							{{
								baseVersion === latestVersion
									? i18n.baseText('settings.context.skills.versions.viewing.back')
									: i18n.baseText('agents.builder.skills.version.viewing.backToPinned', {
											interpolate: { version: String(baseVersion) },
										})
							}}
						</N8nButton>
						<N8nButton
							v-if="canWriteVersions"
							variant="solid"
							size="small"
							:loading="isSaving"
							:disabled="isReadOnly"
							data-testid="skill-version-restore"
							@click="onRestore"
						>
							{{ i18n.baseText('settings.context.skills.versions.viewing.restore') }}
						</N8nButton>
					</div>
				</template>
			</N8nCallout>
			<N8nCallout
				v-else-if="showPinnedCallout"
				theme="warning"
				:class="$style.callout"
				data-testid="skill-version-pinned"
			>
				{{
					i18n.baseText('settings.context.skills.versions.pinned.callout', {
						interpolate: { version: String(baseVersion), latest: String(latestVersion) },
					})
				}}
				<template #trailingContent>
					<div :class="$style.calloutActions">
						<N8nButton
							variant="outline"
							size="small"
							data-testid="skill-version-pinned-see-changes"
							@click="openCompare(baseVersion, latestVersion)"
						>
							{{ i18n.baseText('settings.context.skills.versions.pinned.seeChanges') }}
						</N8nButton>
						<N8nButton
							v-if="data.onUseLatestVersion"
							variant="solid"
							size="small"
							data-testid="agent-skill-use-latest"
							@click="onUseLatestVersion"
						>
							{{ i18n.baseText('settings.context.skills.versions.pinned.useLatest') }}
						</N8nButton>
					</div>
				</template>
			</N8nCallout>
			<div :class="[$style.content, showVersions && timelineOpen && $style.withTimeline]">
				<SkillVersionCompare
					v-if="showVersions && compare"
					v-model:from="compare.from"
					v-model:to="compare.to"
					:versions="versions"
					:latest-version="latestVersion"
					:load-version="loadVersion"
					:unsaved-skill="unsavedSkill"
					@close="compare = null"
				/>
				<AgentSkillUpload
					v-else-if="step === 'upload'"
					v-model:busy="isImporting"
					@uploaded="onSkillUploaded"
					@add-manually="onAddManually"
					@import:skill="onImportSkill"
				/>
				<template v-else>
					<AgentSkillFileNav
						:skill="displayedSkill"
						:selected-path="selectedPath"
						:add-reference-disabled="!canAddReference"
						:read-only="editorLocked"
						@add-reference="onAddReference"
						@remove-reference="onRemoveReference"
						@select="selectedPath = $event"
					/>
					<AgentSkillViewer
						:skill="displayedSkill"
						:selected-path="selectedPath"
						:disabled="editorLocked"
						:read-only="cannotEdit || !!viewing"
						:errors="visibleErrors"
						:show-validation-warnings="submitted || openedWithMissingContent"
						@select:path="selectedPath = $event"
						@update:skill="onSkillUpdate"
						@update:valid="onValidUpdate"
					>
						<template v-if="showScope" #fields-start>
							<N8nInputLabel
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
											:disabled="!canChangeScope || isSaving || !!viewing"
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
						</template>
						<template v-else-if="showAvailabilitySelect" #fields-start>
							<N8nInputLabel
								:label="i18n.baseText('agents.builder.skills.availableTo.label')"
								:tooltip-text="i18n.baseText('agents.builder.skills.availableTo.tooltip')"
								show-tooltip
								size="small"
							>
								<N8nTooltip
									:content="i18n.baseText('agents.builder.skills.availableTo.locked')"
									:disabled="!usedByOtherAgents"
									placement="top"
								>
									<N8nSelect
										v-model="availableTo"
										:teleported="false"
										:disabled="usedByOtherAgents || !!viewing"
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
								</N8nTooltip>
							</N8nInputLabel>
						</template>
					</AgentSkillViewer>
				</template>
				<div v-if="showVersions && timelineOpen" :class="$style.timelineColumn">
					<SkillVersionTimeline
						:versions="versions"
						:latest-version="latestVersion"
						:used-by="skillAccess?.usedBy"
						:selected-version="viewing?.version ?? baseVersion"
						:loading="versionsLoading"
						@select="onSelectVersion"
						@compare="openCompare($event, latestVersion)"
						@close="closeTimeline"
					/>
				</div>
			</div>
			<SkillVersionNameDialog
				v-if="showVersions"
				:open="nameDialog !== null"
				:mode="nameDialog ?? 'name'"
				:latest-version="latestVersion"
				:initial-label="latestVersionLabel"
				:loading="namingVersion || isSaving"
				@cancel="nameDialog = null"
				@submit="onNameVersion"
			/>
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
				{{ i18n.baseText('agents.builder.skills.version.followLatest') }}
			</N8nButton>
			<N8nButton
				v-else
				variant="solid"
				:disabled="!hasChanges || defaultNameLoading"
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
	min-height: min(
		calc(70dvh - var(--spacing--lg)),
		calc(var(--height--5xl) * 6 - var(--spacing--lg))
	);
	display: flex;
}

.picker {
	width: min(calc(52rem - var(--spacing--lg) * 2), calc(100dvw - var(--spacing--lg) * 5));
	height: 100%;
}

.callout {
	margin: var(--spacing--md) var(--spacing--lg) 0;
}

.footerHint {
	text-align: right;
}

.availabilityOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

/* The timeline takes its room next to the editor, not over it. */
.withTimeline {
	width: min(72rem, calc(100dvw - var(--spacing--lg) * 3));
}

.timelineColumn {
	flex: 0 0 20rem;
	min-height: 0;
	border-left: var(--border);
	/* As tall as the scrolling modal body (see AgentModal), so the version list scrolls on
	its own and stays in view while the editor scrolls. */
	position: sticky;
	top: 0;
	align-self: flex-start;
	height: min(70dvh, calc(var(--height--5xl) * 6));
}

.calloutActions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-left: var(--spacing--xs);
}

.versionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.versionStatus {
	white-space: nowrap;
}

/* The split button of the workflow header: Save, then the version menu. */
.buttonGroup {
	display: inline-flex;
	border: var(--border);
	border-radius: var(--radius--full);
}

.groupButtonLeft,
.groupButtonLeft:disabled,
.groupButtonLeft:hover:disabled {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right-color: transparent;
}

.groupButtonLeft:hover {
	border-right-color: inherit;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: var(--border);
}

.buttonGroup:has(.groupButtonLeft:not(:disabled):hover) .groupButtonRight {
	border-left-color: transparent;
}

.saveLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

@media (max-width: 480px) {
	.content {
		flex-direction: column;
	}
}
</style>
