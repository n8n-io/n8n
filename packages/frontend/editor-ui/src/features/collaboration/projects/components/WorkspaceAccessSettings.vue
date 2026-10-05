<script lang="ts" setup>
/**
 * PROTOTYPE (workspaces): who can join the workspace, and whether its members
 * get every project in it. Each change saves at once, apart from the form.
 */
import { useToast } from '@n8n/composables/useToast';
import { N8nRadioGroup, N8nRadioGroupItem, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import { computed, ref } from 'vue';

import { useProjectsStore } from '../projects.store';
import { useWorkspacesStore } from '../workspaces.store';

const CASCADE = 'cascade';
const PER_PROJECT = 'perProject';

const i18n = useI18n();
const toast = useToast();
const projectsStore = useProjectsStore();
const workspacesStore = useWorkspacesStore();

const saving = ref(false);
const workspace = computed(() => projectsStore.currentProject);
const isPublic = computed(() => workspace.value?.isPublic ?? true);
const projectAccess = computed(() => (workspace.value?.cascadeMembers ? CASCADE : PER_PROJECT));

async function save(payload: { isPublic?: boolean; cascadeMembers?: boolean }) {
	const id = workspace.value?.id;
	if (!id) return;
	saving.value = true;
	try {
		await workspacesStore.updateAccess(id, payload);
		// The cascade adds and removes members, so load the workspace again.
		await projectsStore.getProject(id);
		toast.showMessage({ type: 'success', title: i18n.baseText('workspaces.access.saved') });
	} catch (error) {
		toast.showError(error, i18n.baseText('workspaces.access.error'));
	} finally {
		saving.value = false;
	}
}

const onPublicChange = async (value: string | number | boolean) =>
	await save({ isPublic: Boolean(value) });

const onProjectAccessChange = async (value: unknown) =>
	await save({ cascadeMembers: value === CASCADE });
</script>

<template>
	<fieldset data-test-id="workspace-access-settings">
		<h3>
			<label>{{ i18n.baseText('workspaces.access.title') }}</label>
		</h3>

		<div :class="$style.row">
			<div :class="$style.info">
				<N8nText bold>{{ i18n.baseText('workspaces.access.public.title') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('workspaces.access.public.description') }}
				</N8nText>
			</div>
			<ElSwitch
				:model-value="isPublic"
				size="large"
				:loading="saving"
				data-test-id="workspace-public-toggle"
				@update:model-value="onPublicChange"
			/>
		</div>

		<div :class="$style.group">
			<N8nText bold>{{ i18n.baseText('workspaces.access.projects.title') }}</N8nText>
			<N8nRadioGroup
				:model-value="projectAccess"
				:disabled="saving"
				data-test-id="workspace-project-access"
				@update:model-value="onProjectAccessChange"
			>
				<N8nRadioGroupItem
					:value="CASCADE"
					:label="i18n.baseText('workspaces.access.projects.cascade')"
					:description="i18n.baseText('workspaces.access.projects.cascade.description')"
					data-test-id="workspace-project-access-cascade"
				/>
				<N8nRadioGroupItem
					:value="PER_PROJECT"
					:label="i18n.baseText('workspaces.access.projects.perProject')"
					:description="i18n.baseText('workspaces.access.projects.perProject.description')"
					data-test-id="workspace-project-access-per-project"
				/>
			</N8nRadioGroup>
		</div>
	</fieldset>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding-bottom: var(--spacing--md);
}

.info,
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.group {
	gap: var(--spacing--xs);
}
</style>
