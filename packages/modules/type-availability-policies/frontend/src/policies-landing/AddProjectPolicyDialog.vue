<script setup lang="ts">
import type { ProjectPolicySummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import ProjectPolicyIcon from '../components/ProjectPolicyIcon.vue';
import { createProjectPolicy } from '../type-availability-policies.api';
import { PROJECT_POLICY_VIEW } from '../type-availability-policies.constants';

const { projects } = defineProps<{
	projects: ProjectPolicySummary[];
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
	/** A project gained a policy, from this dialog or from another admin, so the list is stale. */
	listChanged: [];
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const rootStore = useRootStore();

const projectId = ref<string>();
const saving = ref(false);
const error = ref<string>();

const picked = computed(() => projects.find((project) => project.projectId === projectId.value));

watch(open, (isOpen) => {
	if (!isOpen) return;
	projectId.value = undefined;
	error.value = undefined;
});

async function onAdd() {
	const project = picked.value;
	if (!project) return;
	saving.value = true;
	error.value = undefined;
	try {
		await createProjectPolicy(rootStore.restApiContext, project.projectId);
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
		if (e instanceof ResponseError && e.httpStatusCode === 409) {
			// The reload drops the project from the options, and a select shows an unmatched value raw.
			projectId.value = undefined;
			emit('listChanged');
		}
		return;
	} finally {
		saving.value = false;
	}
	emit('listChanged');
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.success.title', {
			interpolate: { name: project.name },
		}),
		message: i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.success.message'),
	});
	// An admin who closed the dialog while the add ran stays on this page.
	if (!open.value) return;
	open.value = false;
	void router.push({ name: PROJECT_POLICY_VIEW, params: { teamProjectId: project.projectId } });
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.title')"
		:aria-description="i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.ariaDescription')"
		size="medium"
		data-test-id="add-project-policy-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.description') }}
			</N8nText>
			<N8nInputLabel
				:label="i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.project')"
				:bold="false"
				size="small"
			>
				<N8nSelect
					v-model="projectId"
					:placeholder="i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.placeholder')"
					:teleported="false"
					data-test-id="add-project-policy-select"
				>
					<N8nOption
						v-for="project in projects"
						:key="project.projectId"
						:value="project.projectId"
						:label="project.name"
					>
						<span :class="$style.option">
							<ProjectPolicyIcon :icon="project.icon" size="small" />
							{{ project.name }}
						</span>
					</N8nOption>
				</N8nSelect>
			</N8nInputLabel>
			<N8nText tag="p" size="xsmall" color="text-light">
				{{ i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.teamOnly') }}
			</N8nText>
			<N8nCallout v-if="error" theme="danger" data-test-id="add-project-policy-error">
				<N8nText bold size="small">
					{{ i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.error') }}
				</N8nText>
				<N8nText tag="p" size="small">{{ error }}</N8nText>
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="ghost" @click="open = false">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				:disabled="!picked"
				:loading="saving"
				data-test-id="add-project-policy-submit"
				@click="onAdd"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.addProjectPolicy.submit') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
