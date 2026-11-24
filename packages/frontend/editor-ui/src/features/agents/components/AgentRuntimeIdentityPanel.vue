<script setup lang="ts">
import type { AgentRuntimeIdentityStatus } from '@n8n/api-types';
import { N8nCallout, N8nCard, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref } from 'vue';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { getAgentRuntimeIdentity, updateAgentRuntimeIdentity } from '../composables/useAgentApi';
import shared from '../styles/agent-panel.module.scss';

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const message = useMessage();

const projectsStore = useProjectsStore();

const status = ref<AgentRuntimeIdentityStatus | null>(null);
const saving = ref(false);

const visible = computed(() => status.value?.available === true);

// The agent's account is a member of the project, so the people who manage members can disable it.
const canManage = computed(() => {
	const project =
		projectsStore.myProjects.find((p) => p.id === props.projectId) ??
		(projectsStore.currentProject?.id === props.projectId ? projectsStore.currentProject : null);
	return getResourcePermissions(project?.scopes).project.manageMembers === true;
});

onMounted(async () => {
	try {
		status.value = await getAgentRuntimeIdentity(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch {
		// The panel stays hidden. The rest of the settings still work.
		status.value = null;
	}
});

async function onToggle(disabled: boolean) {
	if (disabled) {
		const choice = await message.confirm(
			i18n.baseText('agents.builder.runtimeIdentity.disable.confirm.message'),
			i18n.baseText('agents.builder.runtimeIdentity.disable.confirm.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('agents.builder.runtimeIdentity.disable.confirm.button'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (choice !== MODAL_CONFIRM) return;
	}

	saving.value = true;
	try {
		status.value = await updateAgentRuntimeIdentity(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			disabled,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.runtimeIdentity.error'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<N8nCard v-if="visible && status" data-testid="agent-runtime-identity-card">
		<div :class="$style.panel" data-testid="agent-runtime-identity-panel">
			<N8nCallout v-if="status.disabled" theme="warning" data-testid="agent-disabled-callout">
				{{ i18n.baseText('agents.builder.runtimeIdentity.disabledCallout') }}
			</N8nCallout>
			<div :class="shared.settingRow">
				<div :class="shared.settingLabel">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.builder.runtimeIdentity.disable.label') }}
					</N8nText>
					<N8nText size="small" :class="shared.dataEntrySubLabel">
						{{
							canManage
								? i18n.baseText('agents.builder.runtimeIdentity.disable.hint')
								: i18n.baseText('agents.builder.runtimeIdentity.disable.hintNoAccess')
						}}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="status.disabled"
					:disabled="!canManage || saving"
					:class="shared.settingControl"
					data-testid="agent-disable-toggle"
					data-attr="agent-disable-toggle"
					@update:model-value="onToggle"
				/>
			</div>
			<N8nText
				v-if="!status.actsAsServiceAccount"
				size="small"
				color="text-light"
				data-testid="agent-runtime-identity-personal-hint"
			>
				{{ i18n.baseText('agents.builder.runtimeIdentity.personalProjectHint') }}
			</N8nText>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}
</style>
