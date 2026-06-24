<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nText, N8nSelect, N8nOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useEnvironmentsStore } from '../environments.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useToast } from '@/app/composables/useToast';

const props = defineProps<{ projectId: string; environmentId: string }>();

const i18n = useI18n();
const toast = useToast();
const environmentsStore = useEnvironmentsStore();
const credentialsStore = useCredentialsStore();

const saving = ref(false);

/** Draft: sourceCredentialId → targetCredentialId (empty string = no swap) */
const draft = ref<Record<string, string>>({});

const projectCredentials = computed(() =>
	credentialsStore.allCredentials.filter(
		(c) =>
			c.homeProject?.id === props.projectId ||
			c.sharedWithProjects?.some((p) => p.id === props.projectId),
	),
);

const currentBindings = computed(
	() => environmentsStore.credentialBindings[props.environmentId] ?? [],
);

onMounted(async () => {
	await Promise.all([
		credentialsStore.fetchAllCredentials({ projectId: props.projectId }),
		environmentsStore.fetchCredentialBindings(props.projectId, props.environmentId),
	]);
	initDraft();
});

function initDraft() {
	const bindingMap: Record<string, string> = {};
	for (const b of currentBindings.value) {
		bindingMap[b.sourceCredentialId] = b.targetCredentialId;
	}
	const d: Record<string, string> = {};
	for (const cred of projectCredentials.value) {
		d[cred.id] = bindingMap[cred.id] ?? '';
	}
	draft.value = d;
}

function targetOptionsFor(sourceId: string) {
	const source = credentialsStore.getCredentialById(sourceId);
	return projectCredentials.value.filter((c) => c.id !== sourceId && c.type === source?.type);
}

async function save() {
	saving.value = true;
	try {
		const bindings = Object.entries(draft.value)
			.filter(([, targetId]) => targetId !== '')
			.map(([sourceCredentialId, targetCredentialId]) => ({
				sourceCredentialId,
				targetCredentialId,
			}));
		await environmentsStore.saveCredentialBindings(props.projectId, props.environmentId, bindings);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('projects.settings.environments.bindings.save.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.environments.bindings.save.error'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div :class="$style.bindings">
		<N8nText tag="h4" size="small" :bold="true" :class="$style.title">
			{{ i18n.baseText('projects.settings.environments.bindings.title') }}
		</N8nText>

		<N8nText v-if="projectCredentials.length === 0" color="text-light" size="small">
			{{ i18n.baseText('projects.settings.environments.bindings.noCredentials') }}
		</N8nText>

		<template v-else>
			<div :class="$style.header">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('projects.settings.environments.bindings.source') }}
				</N8nText>
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('projects.settings.environments.bindings.target') }}
				</N8nText>
			</div>

			<div v-for="cred in projectCredentials" :key="cred.id" :class="$style.row">
				<N8nText size="small">{{ cred.name }}</N8nText>
				<N8nSelect
					v-model="draft[cred.id]"
					size="small"
					:placeholder="i18n.baseText('projects.settings.environments.bindings.noTarget')"
					clearable
				>
					<N8nOption
						v-for="target in targetOptionsFor(cred.id)"
						:key="target.id"
						:value="target.id"
						:label="target.name"
					/>
				</N8nSelect>
			</div>

			<N8nButton
				size="small"
				type="primary"
				:loading="saving"
				:class="$style.saveBtn"
				@click="save"
			>
				{{ i18n.baseText('projects.settings.environments.bindings.save') }}
			</N8nButton>
		</template>
	</div>
</template>

<style lang="scss" module>
.bindings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	margin-top: var(--spacing-s);
	padding-top: var(--spacing-s);
	border-top: 1px solid var(--color-foreground-base);
}

.title {
	margin: 0;
}

.header {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing-xs);
	padding-bottom: var(--spacing-2xs);
}

.row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing-xs);
	align-items: center;
}

.saveBtn {
	align-self: flex-start;
	margin-top: var(--spacing-2xs);
}
</style>
