<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { N8nLoading, N8nTableBase, N8nText } from '@n8n/design-system';
import type { RoleProjectAssignment } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useAsyncState } from '@vueuse/core';
import dateformat from 'dateformat';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import RoleProjectMembersModal from './RoleProjectMembersModal.vue';

const props = defineProps<{ roleSlug: string }>();

const rolesStore = useRolesStore();
const i18n = useI18n();

const {
	state: assignments,
	isLoading,
	execute,
} = useAsyncState(async () => await rolesStore.fetchRoleAssignments(props.roleSlug), {
	projects: [],
	totalProjects: 0,
});

watch(
	() => props.roleSlug,
	async () => await execute(),
);

const membersModalOpen = ref(false);
const selectedProject = ref<RoleProjectAssignment | null>(null);

type SortColumn = 'projectName' | 'memberCount' | 'lastAssigned';
const sortColumn = ref<SortColumn>('memberCount');
const sortDirection = ref<'asc' | 'desc'>('desc');

const sortedProjects = computed(() => {
	const projects = [...assignments.value.projects];
	return projects.sort((a, b) => {
		let cmp = 0;
		if (sortColumn.value === 'projectName') {
			cmp = a.projectName.localeCompare(b.projectName);
		} else if (sortColumn.value === 'memberCount') {
			cmp = a.memberCount - b.memberCount;
		} else {
			cmp = (a.lastAssigned ?? '').localeCompare(b.lastAssigned ?? '');
		}
		return sortDirection.value === 'desc' ? -cmp : cmp;
	});
});

function toggleSort(column: SortColumn) {
	if (sortColumn.value === column) {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
	} else {
		sortColumn.value = column;
		sortDirection.value = column === 'memberCount' ? 'desc' : 'asc';
	}
}

function sortIndicator(column: SortColumn): string {
	if (sortColumn.value !== column) return '';
	return sortDirection.value === 'asc' ? ' ↑' : ' ↓';
}

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
					<th :class="$style.sortableHeader" @click="toggleSort('projectName')">
						{{ i18n.baseText('projectRoles.assignments.projectColumn')
						}}{{ sortIndicator('projectName') }}
					</th>
					<th
						:class="[$style.alignRight, $style.sortableHeader]"
						@click="toggleSort('memberCount')"
					>
						{{ i18n.baseText('projectRoles.assignments.membersColumn')
						}}{{ sortIndicator('memberCount') }}
					</th>
					<th :class="$style.sortableHeader" @click="toggleSort('lastAssigned')">
						{{ i18n.baseText('projectRoles.assignments.lastAssignedColumn')
						}}{{ sortIndicator('lastAssigned') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="project in sortedProjects" :key="project.projectId">
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
						{{ formatDate(project.lastAssigned) }}
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
	text-align: right !important;
}

.sortableHeader {
	cursor: pointer;
	user-select: none;
}

.projectLink {
	color: var(--color--text);
	text-decoration: underline;
}

.projectLink:hover {
	color: var(--color--primary);
}

.memberCountButton {
	background: none;
	border: none;
	color: var(--color--text);
	text-decoration: underline;
	cursor: pointer;
	font-size: inherit;
	padding: 0;
}

.memberCountButton:hover {
	color: var(--color--primary);
}
</style>
