<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import {
	N8nButton,
	N8nCard,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nSwitch2,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useEnvironmentsStore } from '../environments.store';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

const props = defineProps<{ projectId: string; selectedEnvId?: string | null }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const environmentsStore = useEnvironmentsStore();

const newEnvName = ref('');
const editingId = ref<string | null>(null);
const editingName = ref('');
const showAddForm = ref(false);

const hasEnvironments = computed(() => environmentsStore.environments.length > 0);
const canDeleteEnvironment = computed(() => environmentsStore.environments.length > 2);

onMounted(async () => {
	await environmentsStore.fetchEnvironments(props.projectId);
});

async function onEnableToggle() {
	const confirmed = await message.confirm(
		i18n.baseText('projects.settings.environments.enable.confirm.message'),
		i18n.baseText('projects.settings.environments.enable.confirm.title'),
		{
			confirmButtonText: i18n.baseText('projects.settings.environments.enable.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await environmentsStore.initializeEnvironments(props.projectId);
	} catch {
		toast.showError(new Error(), i18n.baseText('projects.settings.environments.enable.error'));
	}
}

async function addEnvironment() {
	const name = newEnvName.value.trim();
	if (!name) return;
	try {
		await environmentsStore.createEnvironment(props.projectId, name);
		newEnvName.value = '';
		showAddForm.value = false;
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
	const confirmed = await message.confirm(
		i18n.baseText('projects.settings.environments.delete.confirm', { interpolate: { name } }),
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await environmentsStore.deleteEnvironment(props.projectId, id);
	} catch {
		toast.showError(new Error(), i18n.baseText('projects.settings.environments.delete.error'));
	}
}
</script>

<template>
	<div>
		<div
			v-if="!hasEnvironments"
			:style="{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }"
		>
			<N8nSwitch2 :model-value="false" size="small" @update:model-value="onEnableToggle" />
			<N8nText>{{ i18n.baseText('projects.settings.environments.enable') }}</N8nText>
		</div>

		<template v-if="hasEnvironments">
			<div :style="{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }">
				<N8nCard
					v-for="(env, index) in environmentsStore.environments"
					:key="env.id"
					:style="
						index === environmentsStore.environments.length - 1
							? { marginBottom: 'var(--spacing--sm)' }
							: undefined
					"
				>
					<template v-if="editingId === env.id">
						<div
							:style="{
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)',
								width: '100%',
							}"
						>
							<N8nInput
								v-model="editingName"
								size="small"
								@keyup.enter="saveEdit"
								@keyup.escape="cancelEdit"
							/>
							<N8nButton size="small" type="primary" @click="saveEdit">Save</N8nButton>
							<N8nButton size="small" type="tertiary" @click="cancelEdit">Cancel</N8nButton>
						</div>
					</template>
					<template v-else>
						<N8nText>{{ env.name }}</N8nText>
					</template>
					<template v-if="editingId !== env.id" #append>
						<div :style="{ display: 'flex', gap: 'var(--spacing-2xs)' }">
							<N8nIconButton
								icon="pencil"
								size="small"
								variant="ghost"
								:title="i18n.baseText('generic.edit')"
								@click="startEdit(env.id, env.name)"
							/>
							<N8nIconButton
								v-if="canDeleteEnvironment"
								icon="trash-2"
								size="small"
								variant="ghost"
								:title="i18n.baseText('generic.delete')"
								@click="removeEnvironment(env.id, env.name)"
							/>
						</div>
					</template>
				</N8nCard>
			</div>

			<template v-if="showAddForm">
				<div :style="{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }">
					<N8nInput
						v-model="newEnvName"
						size="small"
						:placeholder="i18n.baseText('projects.settings.environments.name.placeholder')"
						@keyup.enter="addEnvironment"
					/>
					<N8nButton
						size="small"
						type="primary"
						:disabled="!newEnvName.trim()"
						@click="addEnvironment"
					>
						{{ i18n.baseText('projects.settings.environments.add') }}
					</N8nButton>
					<N8nButton
						size="small"
						type="tertiary"
						@click="
							showAddForm = false;
							newEnvName = '';
						"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
				</div>
			</template>
			<template v-else>
				<N8nButton size="small" variant="ghost" @click="showAddForm = true">
					{{ i18n.baseText('projects.settings.environments.addEnvironment') }}
				</N8nButton>
			</template>
		</template>
	</div>
</template>
