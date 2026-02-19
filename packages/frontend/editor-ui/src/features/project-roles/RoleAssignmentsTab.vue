<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { N8nLoading, N8nText } from '@n8n/design-system';
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
		<table v-else :class="$style.table">
			<thead>
				<tr>
					<th :class="$style.th">
						{{ i18n.baseText('projectRoles.assignments.projectColumn') }}
					</th>
					<th :class="[$style.th, $style.alignCenter]">
						{{ i18n.baseText('projectRoles.assignments.membersColumn') }}
					</th>
					<th :class="$style.th">
						{{ i18n.baseText('projectRoles.assignments.lastAssignedColumn') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="project in assignments.projects" :key="project.projectId" :class="$style.row">
					<td :class="$style.td">
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
					<td :class="[$style.td, $style.alignCenter]">
						<button :class="$style.memberCountButton" @click="openMembersModal(project)">
							{{ project.memberCount }}
						</button>
					</td>
					<td :class="$style.td">
						<N8nText color="text-light" size="small">
							{{ formatDate(project.lastAssigned) }}
						</N8nText>
					</td>
				</tr>
			</tbody>
		</table>

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

.table {
	width: 100%;
	border-collapse: collapse;
	border: var(--border);
	border-radius: var(--radius--lg);
}

.th {
	text-align: left;
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	border-bottom: var(--border);
}

.td {
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--sm);
	border-bottom: var(--border);
}

.row:last-child .td {
	border-bottom: none;
}

.alignCenter {
	text-align: center;
}

.projectLink {
	color: var(--color--primary);
	text-decoration: none;
	font-weight: var(--font-weight--bold);
}

.projectLink:hover {
	text-decoration: underline;
}

.memberCountButton {
	background: none;
	border: none;
	color: var(--color--primary);
	cursor: pointer;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	padding: 0;
}

.memberCountButton:hover {
	text-decoration: underline;
}
</style>
