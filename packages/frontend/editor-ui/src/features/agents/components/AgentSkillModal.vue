<script setup lang="ts">
import { computed, ref } from 'vue';
import { AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX } from '@n8n/api-types';
import { N8nButton, N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { createAgentSkill } from '../composables/useAgentApi';
import type { AgentSkill } from '../types';
import AgentSkillViewer from './AgentSkillViewer.vue';

export type AgentSkillModalData = {
	projectId: string;
	agentId: string;
	existingSkillIds: string[];
	onConfirm: (payload: { id: string; skill: AgentSkill }) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentSkillModalData;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const uiStore = useUIStore();

const skill = ref<AgentSkill>({
	name: '',
	description: '',
	instructions: '',
});
const submitted = ref(false);
const submitting = ref(false);
const formIsValid = ref(false);

const existingSkillIds = computed(() => new Set(props.data.existingSkillIds));

function skillNameToId(name: string): string {
	const normalized = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

	return normalized || 'skill';
}

function makeUniqueSkillId(name: string): string {
	const base = skillNameToId(name);
	if (!existingSkillIds.value.has(base)) return base;

	let suffix = 2;
	while (existingSkillIds.value.has(`${base}_${suffix}`)) suffix++;
	return `${base}_${suffix}`;
}

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
	} else if (!AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX.test(description)) {
		errors.description = i18n.baseText('agents.builder.skills.validation.descriptionUseWhen');
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

async function onSave() {
	submitted.value = true;
	if (!canSave.value || submitting.value) return;

	submitting.value = true;
	const skillToCreate: AgentSkill = {
		name: skill.value.name.trim(),
		description: skill.value.description.trim(),
		instructions: skill.value.instructions,
	};
	const skillId = makeUniqueSkillId(skillToCreate.name);

	try {
		const created = await createAgentSkill(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
			skillId,
			skillToCreate,
		);
		props.data.onConfirm({ id: skillId, skill: created });
		closeModal();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.skills.create.error'));
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<Modal
		:name="props.modalName"
		width="860px"
		:custom-class="$style.modal"
		data-test-id="agent-skill-modal"
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
					:disabled="submitting"
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
				<N8nButton variant="subtle" :disabled="submitting" @click="closeModal">
					{{ i18n.baseText('agents.builder.skills.create.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!canSave || submitting"
					:loading="submitting"
					data-test-id="agent-skill-create-save"
					@click="onSave"
				>
					{{ i18n.baseText('agents.builder.skills.create.save') }}
				</N8nButton>
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
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
