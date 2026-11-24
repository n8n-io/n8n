<script setup lang="ts">
import type { ProjectAgentAccess } from '@n8n/api-types';
import { N8nIcon, N8nIconButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { onMounted, ref } from 'vue';

import {
	addProjectAgentAccess,
	getProjectAgentAccess,
	getProjectAgentAccessCandidates,
	removeProjectAgentAccess,
} from '../projects.api';

const props = defineProps<{
	projectId: string;
	/** The user can manage the members of the project. */
	canManage: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();

const agents = ref<ProjectAgentAccess[]>([]);
const candidates = ref<ProjectAgentAccess[]>([]);
const busy = ref(false);

const isOwnAgent = (agent: ProjectAgentAccess) => agent.homeProject?.id === props.projectId;

async function load() {
	const context = rootStore.restApiContext;
	const [current, available] = await Promise.all([
		getProjectAgentAccess(context, props.projectId),
		props.canManage
			? getProjectAgentAccessCandidates(context, props.projectId)
			: Promise.resolve([]),
	]);
	agents.value = current;
	candidates.value = available;
}

onMounted(async () => {
	try {
		await load();
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.agentAccess.error.load'));
	}
});

async function onAdd(serviceAccountId: string) {
	busy.value = true;
	try {
		await addProjectAgentAccess(rootStore.restApiContext, props.projectId, serviceAccountId);
		await load();
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.agentAccess.error.add'));
	} finally {
		busy.value = false;
	}
}

async function onRemove(agent: ProjectAgentAccess) {
	busy.value = true;
	try {
		await removeProjectAgentAccess(
			rootStore.restApiContext,
			props.projectId,
			agent.serviceAccountId,
		);
		await load();
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.agentAccess.error.remove'));
	} finally {
		busy.value = false;
	}
}

function homeLabel(agent: ProjectAgentAccess) {
	if (isOwnAgent(agent)) return i18n.baseText('projects.settings.agentAccess.ownAgent');
	return i18n.baseText('projects.settings.agentAccess.agentIn', {
		interpolate: { project: agent.homeProject?.name ?? '' },
	});
}
</script>

<template>
	<fieldset data-test-id="project-agent-access-section">
		<h3>
			<label for="projectAgentAccess">
				{{ i18n.baseText('projects.settings.agentAccess.title') }}
			</label>
		</h3>
		<N8nText color="text-light" size="small" tag="p" :class="$style.help">
			{{ i18n.baseText('projects.settings.agentAccess.help') }}
		</N8nText>

		<N8nSelect
			v-if="canManage"
			id="projectAgentAccess"
			:class="$style.select"
			size="large"
			filterable
			:model-value="''"
			:disabled="busy || candidates.length === 0"
			:placeholder="
				candidates.length === 0
					? i18n.baseText('projects.settings.agentAccess.noCandidates')
					: i18n.baseText('projects.settings.agentAccess.add')
			"
			data-test-id="project-agent-access-select"
			@update:model-value="onAdd"
		>
			<template #prefix>
				<N8nIcon icon="bot" />
			</template>
			<N8nOption
				v-for="candidate in candidates"
				:key="candidate.serviceAccountId"
				:value="candidate.serviceAccountId"
				:label="candidate.name"
			>
				<span :class="$style.option">
					<span>{{ candidate.name }}</span>
					<N8nText color="text-light" size="small">{{ homeLabel(candidate) }}</N8nText>
				</span>
			</N8nOption>
		</N8nSelect>

		<ul v-if="agents.length > 0" :class="$style.list" data-test-id="project-agent-access-list">
			<li
				v-for="agent in agents"
				:key="agent.serviceAccountId"
				:class="$style.row"
				data-test-id="project-agent-access-row"
			>
				<N8nIcon icon="bot" :class="$style.icon" />
				<span :class="$style.text">
					<N8nText bold>{{ agent.name }}</N8nText>
					<N8nText color="text-light" size="small">{{ homeLabel(agent) }}</N8nText>
				</span>
				<N8nIconButton
					v-if="canManage && !isOwnAgent(agent)"
					icon="trash-2"
					variant="ghost"
					:aria-label="i18n.baseText('projects.settings.agentAccess.remove')"
					:disabled="busy"
					data-test-id="project-agent-access-remove"
					@click="onRemove(agent)"
				/>
			</li>
		</ul>
	</fieldset>
</template>

<style module lang="scss">
.help {
	margin-bottom: var(--spacing--sm);
}

.select {
	max-width: var(--project-field--width);
	margin-bottom: var(--spacing--sm);
}

.option {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0;
	margin: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.icon {
	color: var(--color--text--tint-1);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
}
</style>
