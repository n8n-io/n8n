<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkill } from '../types';
import AgentSkillViewer from './AgentSkillViewer.vue';

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

const skill = ref<AgentSkill>({
	name: props.data.skill?.name ?? '',
	description: props.data.skill?.description ?? '',
	instructions: props.data.skill?.instructions ?? '',
});
const submitted = ref(false);
const formIsValid = ref(false);

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

	return errors;
});

const visibleErrors = computed(() => (submitted.value ? validationErrors.value : {}));
const canSave = computed(() => formIsValid.value);

function onSkillUpdate(updates: Partial<AgentSkill>) {
	skill.value = { ...skill.value, ...updates };
}

function onValidUpdate(valid: boolean) {
	formIsValid.value = valid;
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
		width="860px"
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
				<AgentSkillViewer
					:skill="skill"
					:errors="visibleErrors"
					:scrollable="false"
					:show-validation-warnings="submitted"
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
