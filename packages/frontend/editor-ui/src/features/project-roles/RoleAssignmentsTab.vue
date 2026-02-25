<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { N8nLoading, N8nTableBase, N8nText } from '@n8n/design-system';
import type { RoleProjectAssignment } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useAsyncState } from '@vueuse/core';
import dateformat from 'dateformat';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import RoleProjectMembersModal from './RoleProjectMembersModal.vue';

const props = defineProps<{ roleSlug: string }>();

const rolesStore = useRolesStore();
const i18n = useI18n();

const { state: assignments, isLoading } = useAsyncState(
	async () => await rolesStore.fetchRoleAssignments(props.roleSlug),
	{ projects: [], totalProjects: 0 },
);

const membersModalOpen = ref(false);
const selectedProject = ref<RoleProjectAssignment | null>(null);

function openMembersModal(project: RoleProjectAssignment) {
	selectedProject.value = project;
	membersModalOpen.value = true;
}

function formatDate(dateStr: string | null): string {
	if (!dateStr) return '—';
	return dateformat(new Date(dateStr), 'mmm dS, yyyy');
}
</script>

<template>
	<div :class="$style.container">
		<N8nLoading v-if="isLoading" :rows="3" />
		<div v-else-if="assignments.projects.length === 0" :class="$style.emptyState">
			<N8nText color="text-light">
				{{ i18n.baseText('projectRoles.assignments.emptyState') }}
			</N8nText>
		</div>
		<N8nTableBase v-else>
			<thead>
				<tr>
					<th>
						{{ i18n.baseText('projectRoles.assignments.projectColumn') }}
					</th>
					<th :class="$style.alignRight">
						{{ i18n.baseText('projectRoles.assignments.membersColumn') }}
					</th>
					<th>
						{{ i18n.baseText('projectRoles.assignments.lastAssignedColumn') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="project in assignments.projects" :key="project.projectId">
					<td>
						<RouterLink
							:to="{
								name: VIEWS.PROJECTS_WORKFLOWS,
								params: { projectId: project.projectId },
							}"
							:class="$style.projectLink"
						>
							{{ project.projectName }}
						</RouterLink>
					</td>
					<td :class="$style.alignRight">
						<button :class="$style.memberCountButton" @click="openMembersModal(project)">
							{{ project.memberCount }}
						</button>
					</td>
					<td>
						<N8nText color="text-light" size="small">
							{{ formatDate(project.lastAssigned) }}
						</N8nText>
					</td>
				</tr>
			</tbody>
		</N8nTableBase>

		<RoleProjectMembersModal
			v-if="selectedProject"
			:open="membersModalOpen"
			:role-slug="roleSlug"
			:project-id="selectedProject.projectId"
			:project-name="selectedProject.projectName"
			@update:open="membersModalOpen = $event"
		/>
	</div>
</template>

<style lang="css" module>
.container {
	margin-top: var(--spacing--sm);
}

.emptyState {
	padding: var(--spacing--xl);
	text-align: center;
}

.alignRight {
	text-align: right;
}

.projectLink {
	color: var(--color--text);
	text-decoration: underline;
	font-weight: var(--font-weight--bold);
}

.memberCountButton {
	background: none;
	border: none;
	color: var(--color--text);
	text-decoration: underline;
	cursor: pointer;
	font-size: inherit;
	font-weight: var(--font-weight--bold);
	padding: 0;
}
</style>
