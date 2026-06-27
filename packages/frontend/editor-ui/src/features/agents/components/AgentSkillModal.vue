<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentSkill } from '../types';
import AgentSkillFileNav from './AgentSkillFileNav.vue';
import AgentSkillViewer from './AgentSkillViewer.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillModalData = {
	projectId: string;
	agentId: string;
	skill?: AgentSkill;
	skillId?: string;
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

const skill = ref<AgentSkill>({
	name: props.data.skill?.name ?? '',
	description: props.data.skill?.description ?? '',
	instructions: props.data.skill?.instructions ?? '',
	...(props.data.skill?.allowedTools ? { allowedTools: props.data.skill.allowedTools } : {}),
	...(props.data.skill?.recommendedTools
		? { recommendedTools: props.data.skill.recommendedTools }
		: {}),
	...(props.data.skill?.interface ? { interface: props.data.skill.interface } : {}),
	...(props.data.skill?.policy ? { policy: props.data.skill.policy } : {}),
	...(props.data.skill?.dependencies ? { dependencies: props.data.skill.dependencies } : {}),
	...(props.data.skill?.version ? { version: props.data.skill.version } : {}),
	...(props.data.skill?.license ? { license: props.data.skill.license } : {}),
	...(props.data.skill?.compatibility ? { compatibility: props.data.skill.compatibility } : {}),
	...(props.data.skill?.platforms ? { platforms: props.data.skill.platforms } : {}),
	...(props.data.skill?.metadata ? { metadata: props.data.skill.metadata } : {}),
	...(props.data.skill?.references ? { references: props.data.skill.references } : {}),
});
const submitted = ref(false);
const formIsValid = ref(false);
const selectedPath = ref(SKILL_FILE);

const isEditing = computed(() => !!props.data.skillId);

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
	skill.value = { ...skill.value, ...updates };
	if (
		selectedPath.value !== SKILL_FILE &&
		!skill.value.references?.some((reference) => reference.path === selectedPath.value)
	) {
		selectedPath.value = SKILL_FILE;
	}
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

	const payload: AgentSkill = {
		name: skill.value.name.trim(),
		description: skill.value.description.trim(),
		instructions: skill.value.instructions,
		...(skill.value.allowedTools ? { allowedTools: skill.value.allowedTools } : {}),
		...(skill.value.recommendedTools ? { recommendedTools: skill.value.recommendedTools } : {}),
		...(skill.value.interface ? { interface: skill.value.interface } : {}),
		...(skill.value.policy ? { policy: skill.value.policy } : {}),
		...(skill.value.dependencies ? { dependencies: skill.value.dependencies } : {}),
		...(skill.value.version ? { version: skill.value.version } : {}),
		...(skill.value.license ? { license: skill.value.license } : {}),
		...(skill.value.compatibility ? { compatibility: skill.value.compatibility } : {}),
		...(skill.value.platforms ? { platforms: skill.value.platforms } : {}),
		...(skill.value.metadata ? { metadata: skill.value.metadata } : {}),
		...(skill.value.references ? { references: skill.value.references } : {}),
	};

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
					@select="selectedPath = $event"
				/>
				<AgentSkillViewer
					:skill="skill"
					:selected-path="selectedPath"
					:errors="visibleErrors"
					:scrollable="false"
					:show-validation-warnings="submitted"
					@import:skill="onImportSkill"
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
	margin: calc(-1 * var(--spacing--lg));
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
