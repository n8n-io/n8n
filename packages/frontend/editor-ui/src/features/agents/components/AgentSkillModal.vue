<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useUIStore } from '@/app/stores/ui.store';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentSkill } from '../types';
import { normalizeAgentSkillForSave } from '../utils/agentSkill';
import AgentSkillFileNav from './AgentSkillFileNav.vue';
import AgentSkillViewer, { type AgentSkillAllowedToolOption } from './AgentSkillViewer.vue';
import AgentModal from './modals/AgentModal.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillModalData = {
	projectId: string;
	agentId: string;
	skill?: AgentSkill;
	skillId?: string;
	availableTools?: AgentSkillAllowedToolOption[];
	/**
	 * Names of the agent's other skills, so a duplicate name blocks save while
	 * the modal is still open — skill names must be unique per agent.
	 */
	existingSkillNames?: string[];
	onConfirm: (payload: { id?: string; skill: AgentSkill }) => void;
	onRemove?: (id: string) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentSkillModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const agentTelemetry = useAgentTelemetry();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

function getDefaultSkillName(): string {
	const baseName = i18n.baseText('agents.builder.skills.defaultName' as BaseTextKey);
	const existingNames = new Set(
		(props.data.existingSkillNames ?? []).map((name) => name.trim().toLowerCase()),
	);
	if (!existingNames.has(baseName.toLowerCase())) return baseName;

	let suffix = 2;
	while (existingNames.has(`${baseName} ${suffix}`.toLowerCase())) suffix += 1;
	return `${baseName} ${suffix}`;
}

const skill = ref<AgentSkill>(
	normalizeSkill({
		name: props.data.skill?.name ?? getDefaultSkillName(),
		description: props.data.skill?.description ?? '',
		instructions: props.data.skill?.instructions ?? '',
		...(props.data.skill?.allowedTools ? { allowedTools: props.data.skill.allowedTools } : {}),
		...(props.data.skill?.references ? { references: props.data.skill.references } : {}),
	}),
);
const submitted = ref(false);
const formIsValid = ref(false);
const selectedPath = ref(SKILL_FILE);

const isEditing = computed(() => !!props.data.skillId);
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
	} else if (
		(props.data.existingSkillNames ?? []).some(
			(existingName) => existingName.trim().toLowerCase() === name.toLowerCase(),
		)
	) {
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
const visibleNameError = computed(() =>
	submitted.value ? (validationErrors.value.name ?? '') : '',
);
const canSave = computed(() => formIsValid.value);

function onSkillUpdate(updates: Partial<AgentSkill>) {
	skill.value = normalizeSkill({ ...skill.value, ...updates });
	if (
		selectedPath.value !== SKILL_FILE &&
		!skill.value.references?.some((reference) => reference.path === selectedPath.value)
	) {
		selectedPath.value = SKILL_FILE;
	}
}

function normalizeSkill(skill: AgentSkill): AgentSkill {
	return normalizeAgentSkillForSave(
		skill,
		props.data.availableTools?.map((tool) => tool.name),
	);
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
	agentTelemetry.trackImportedSkill({
		agentId: props.data.agentId,
		...payload,
	});
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onSave() {
	submitted.value = true;
	if (!canSave.value) return;

	const payload = normalizeSkill({
		name: skill.value.name.trim(),
		description: skill.value.description.trim(),
		instructions: skill.value.instructions,
		...(skill.value.allowedTools ? { allowedTools: skill.value.allowedTools } : {}),
		...(skill.value.references ? { references: skill.value.references } : {}),
	});

	props.data.onConfirm({ id: props.data.skillId, skill: payload });
	closeModal();
}

function onRemove() {
	if (!props.data.skillId) return;
	props.data.onRemove?.(props.data.skillId);
	closeModal();
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="skill.name"
		:title-placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
		:title-error="visibleNameError"
		:title-max-length="128"
		size="fit"
		editable-title
		data-testid="agent-skill-modal"
		@update:open="!$event && closeModal()"
		@update:title="onSkillUpdate({ name: $event })"
	>
		<N8nCallout
			v-if="openedWithMissingContent"
			theme="warning"
			data-testid="agent-skill-missing-content-callout"
		>
			{{ i18n.baseText('agents.builder.skills.missingContent.callout' as BaseTextKey) }}
		</N8nCallout>
		<div :class="$style.content">
			<AgentSkillFileNav
				:skill="skill"
				:selected-path="selectedPath"
				:add-reference-disabled="!canAddReference"
				@add-reference="onAddReference"
				@remove-reference="onRemoveReference"
				@select="selectedPath = $event"
			/>
			<AgentSkillViewer
				:skill="skill"
				:available-tools="props.data.availableTools ?? []"
				:existing-skill-names="props.data.existingSkillNames ?? []"
				:selected-path="selectedPath"
				:errors="visibleErrors"
				:scrollable="false"
				:show-name-field="false"
				:show-validation-warnings="submitted || openedWithMissingContent"
				@import:skill="onImportSkill"
				@select:path="selectedPath = $event"
				@update:skill="onSkillUpdate"
				@update:valid="onValidUpdate"
			/>
		</div>

		<template v-if="isEditing && data.onRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-skill-remove" @click="onRemove">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.skills.remove') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton variant="solid" data-testid="agent-skill-create-save" @click="onSave">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module>
.content {
	/* The Design System has no width preset between 2xlarge and full. */
	width: min(52rem, calc(100dvw - var(--spacing--lg) * 3));
	height: min(calc(70dvh - var(--spacing--lg)), calc(var(--height--5xl) * 6 - var(--spacing--lg)));
	min-height: 0;
	display: flex;
}

@media (max-width: 480px) {
	.content {
		flex-direction: column;
	}
}
</style>
