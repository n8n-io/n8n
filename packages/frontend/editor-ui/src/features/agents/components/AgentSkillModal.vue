<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonSkillRef } from '@n8n/api-types';

import Modal from '@/app/components/Modal.vue';

const props = defineProps<{
	modalName: string;
	data: {
		onConfirm: (skill: AgentJsonSkillRef) => void;
	};
}>();

const i18n = useI18n();
const name = ref('');
const description = ref('');
const definition = ref('');

const canSave = computed(() => name.value.trim().length > 0 && definition.value.trim().length > 0);

function createSkillId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `skill-${crypto.randomUUID()}`;
	}
	return `skill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function save() {
	if (!canSave.value) return;
	const skill: AgentJsonSkillRef = {
		id: createSkillId(),
		name: name.value.trim(),
		enabled: true,
		definition: definition.value.trim(),
	};
	const trimmedDescription = description.value.trim();
	if (trimmedDescription) skill.description = trimmedDescription;
	props.data.onConfirm(skill);
}
</script>

<template>
	<Modal :name="props.modalName" width="520px" data-test-id="agent-skill-modal">
		<template #header>
			<N8nText tag="h2" size="large" :bold="true">{{
				i18n.baseText('agents.builder.skills.modal.title')
			}}</N8nText>
		</template>

		<template #content>
			<div :class="$style.content">
				<label :class="$style.field">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.skills.modal.name')
					}}</N8nText>
					<N8nInput v-model="name" data-testid="agent-skill-name" />
				</label>

				<label :class="$style.field">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.skills.modal.description')
					}}</N8nText>
					<N8nInput v-model="description" data-testid="agent-skill-description" />
				</label>

				<label :class="$style.field">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.skills.modal.definition')
					}}</N8nText>
					<N8nInput v-model="definition" type="textarea" data-testid="agent-skill-definition" />
				</label>
			</div>
		</template>

		<template #footer>
			<N8nButton type="primary" :disabled="!canSave" data-testid="agent-skill-save" @click="save">
				{{ i18n.baseText('agents.builder.skills.modal.save') }}
			</N8nButton>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
