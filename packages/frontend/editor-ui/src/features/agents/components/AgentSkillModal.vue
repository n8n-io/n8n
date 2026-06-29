<script setup lang="ts">
import { computed, ref } from 'vue';
import { AGENT_SKILL_REFERENCE_MAX_COUNT } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentSkill } from '../types';
import { normalizeAgentSkillForSave } from '../utils/agentSkill';
import AgentSkillFileNav from './AgentSkillFileNav.vue';
import AgentSkillViewer, { type AgentSkillAllowedToolOption } from './AgentSkillViewer.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillModalData = {
	projectId: string;
	agentId: string;
	skill?: AgentSkill;
	skillId?: string;
	availableTools?: AgentSkillAllowedToolOption[];
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

const skill = ref<AgentSkill>(
	normalizeSkill({
		name: props.data.skill?.name ?? '',
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

const validationErrors = computed<Partial<Record<keyof AgentSkill, string>>>(() => {
	const errors: Partial<Record<keyof AgentSkill, string>> = {};
	const name = skill.value.name.trim();
	const description = skill.value.description.trim();
	const instructions = skill.value.instructions.trim();

	if (!name) {
		errors.name = i18n.baseText('agents.builder.skills.validation.nameRequired');
	} else if (name.length > 128) {
		errors.name = i18n.baseText('agents.builder.skills.validation.nameMaxLength');
	}

	if (!description) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionRequired');
	} else if (description.length > 512) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionMaxLength');
	}

	if (!instructions) {
		errors.instructions = i18n.baseText('agents.builder.skills.validation.instructionsRequired');
	}
	if (skill.value.references?.some((reference) => !reference.content.trim())) {
		errors.references = i18n.baseText('agents.builder.skills.references.invalidSummary');
	}

	return errors;
});

const visibleErrors = computed(() => (submitted.value ? validationErrors.value : {}));
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
	<Modal
		:name="props.modalName"
		width="1100px"
		:custom-class="$style.modal"
		data-testid="agent-skill-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.builder.skills.create.title') }}
			</N8nHeading>
		</template>

		<template #content>
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
					:selected-path="selectedPath"
					:errors="visibleErrors"
					:scrollable="false"
					:show-validation-warnings="submitted"
					@import:skill="onImportSkill"
					@select:path="selectedPath = $event"
					@update:skill="onSkillUpdate"
					@update:valid="onValidUpdate"
				/>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditing && data.onRemove"
					variant="subtle"
					data-testid="agent-skill-remove"
					@click="onRemove"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.skills.remove') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('agents.builder.skills.create.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canSave"
						data-testid="agent-skill-create-save"
						@click="onSave"
					>
						{{ i18n.baseText('agents.builder.skills.create.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module>
.content {
	height: 620px;
	min-height: 0;
	margin: 0 calc(-1 * var(--spacing--lg)) calc(-1 * var(--spacing--lg));
	display: flex;
}

.modal {
	:global(.modal-content) {
		overflow: hidden;
	}
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}
</style>
