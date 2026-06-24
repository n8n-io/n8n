<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useEnvironmentsStore } from '../environments.store';
import { useToast } from '@/app/composables/useToast';

const props = defineProps<{ projectId: string; selectedEnvId?: string | null }>();

const i18n = useI18n();
const toast = useToast();
const environmentsStore = useEnvironmentsStore();

const newEnvName = ref('');
const editingId = ref<string | null>(null);
const editingName = ref('');

onMounted(async () => {
	await environmentsStore.fetchEnvironments(props.projectId);
});

async function addEnvironment() {
	const name = newEnvName.value.trim();
	if (!name) return;
	try {
		await environmentsStore.createEnvironment(props.projectId, name);
		newEnvName.value = '';
	} catch {
		toast.showError(new Error(), i18n.baseText('projects.settings.environments.create.error'));
	}
}

function startEdit(id: string, name: string) {
	editingId.value = id;
	editingName.value = name;
}

async function saveEdit() {
	if (!editingId.value) return;
	const name = editingName.value.trim();
	if (!name) return;
	try {
		await environmentsStore.updateEnvironment(props.projectId, editingId.value, name);
		editingId.value = null;
	} catch {
		toast.showError(new Error(), i18n.baseText('projects.settings.environments.update.error'));
	}
}

function cancelEdit() {
	editingId.value = null;
}

async function removeEnvironment(id: string, name: string) {
	if (
		!confirm(
			i18n.baseText('projects.settings.environments.delete.confirm', { interpolate: { name } }),
		)
	) {
		return;
	}
	try {
		await environmentsStore.deleteEnvironment(props.projectId, id);
	} catch {
		toast.showError(new Error(), i18n.baseText('projects.settings.environments.delete.error'));
	}
}
</script>

<template>
	<div>
		<ul v-if="environmentsStore.environments.length > 0">
			<li
				v-for="env in environmentsStore.environments"
				:key="env.id"
				style="
					display: flex;
					align-items: center;
					gap: var(--spacing-xs);
					margin-bottom: var(--spacing-xs);
				"
			>
				<template v-if="editingId === env.id">
					<N8nInput
						v-model="editingName"
						size="small"
						@keyup.enter="saveEdit"
						@keyup.escape="cancelEdit"
					/>
					<N8nButton size="small" type="primary" @click="saveEdit">Save</N8nButton>
					<N8nButton size="small" type="secondary" @click="cancelEdit">Cancel</N8nButton>
				</template>
				<template v-else>
					<N8nText>{{ env.name }}</N8nText>
					<N8nButton size="small" type="secondary" @click="startEdit(env.id, env.name)"
						>Edit</N8nButton
					>
					<N8nButton size="small" type="tertiary" @click="removeEnvironment(env.id, env.name)"
						>Delete</N8nButton
					>
				</template>
			</li>
		</ul>
		<N8nText v-else color="text-light">
			{{ i18n.baseText('projects.settings.environments.empty') }}
		</N8nText>

		<div style="display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-s)">
			<N8nInput
				v-model="newEnvName"
				size="small"
				:placeholder="i18n.baseText('projects.settings.environments.name.placeholder')"
				@keyup.enter="addEnvironment"
			/>
			<N8nButton size="small" type="primary" :disabled="!newEnvName.trim()" @click="addEnvironment">
				{{ i18n.baseText('projects.settings.environments.add') }}
			</N8nButton>
		</div>
	</div>
</template>
