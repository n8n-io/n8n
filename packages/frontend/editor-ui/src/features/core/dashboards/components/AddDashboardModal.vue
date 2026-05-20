<script setup lang="ts">
import { ref } from 'vue';
import { N8nInput, N8nButton, N8nText } from '@n8n/design-system';

import { useDashboardsStore } from '@/features/core/dashboards/dashboards.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useRouter } from 'vue-router';
import { DASHBOARD_DETAILS, ADD_DASHBOARD_MODAL_KEY } from '@/features/core/dashboards/constants';

const router = useRouter();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const dashboardsStore = useDashboardsStore();

const name = ref('');
const description = ref('');
const saving = ref(false);
const error = ref('');

async function submit() {
	if (!name.value.trim()) return;
	const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
	if (!projectId) return;

	saving.value = true;
	error.value = '';
	try {
		const created = await dashboardsStore.createDashboard(projectId, {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			spec: {
				version: 1,
				views: [{ id: 'overview', name: 'Overview', widgets: [] }],
			},
		});
		uiStore.closeModal(ADD_DASHBOARD_MODAL_KEY);
		await router.push({
			name: DASHBOARD_DETAILS,
			params: { projectId, id: created.id },
		});
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		saving.value = false;
	}
}

function cancel() {
	uiStore.closeModal(ADD_DASHBOARD_MODAL_KEY);
}
</script>

<template>
	<div class="add-dashboard-modal">
		<N8nText tag="h2" size="large" bold>Create dashboard</N8nText>
		<N8nInput v-model="name" placeholder="Dashboard name" />
		<N8nInput
			v-model="description"
			type="textarea"
			placeholder="Description (optional)"
			:rows="3"
		/>
		<N8nText v-if="error" color="danger" size="small">{{ error }}</N8nText>
		<footer class="add-dashboard-modal__footer">
			<N8nButton type="tertiary" label="Cancel" @click="cancel" />
			<N8nButton type="primary" label="Create" :loading="saving" @click="submit" />
		</footer>
	</div>
</template>

<style scoped lang="scss">
.add-dashboard-modal {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	padding: var(--spacing-m);
	min-width: 400px;
}
.add-dashboard-modal__footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-2xs);
}
</style>
