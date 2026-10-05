<script lang="ts" setup>
/** PROTOTYPE (workspaces): the projects inside a workspace. */
import { VIEWS } from '@/app/constants';
import { N8nCard, N8nEmptyState, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

import ProjectHeader from '../components/ProjectHeader.vue';
import ProjectIcon from '../components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '../projects.constants';
import { ProjectTypes } from '../projects.types';
import { useWorkspacesStore } from '../workspaces.store';

const i18n = useI18n();
const route = useRoute();
const workspacesStore = useWorkspacesStore();

const workspaceId = computed(() => String(route.params.projectId));
const projects = computed(() => workspacesStore.projectsIn(workspaceId.value));
const hiddenCount = computed(() => {
	const total = workspacesStore.getById(workspaceId.value)?.projectCount ?? projects.value.length;
	return Math.max(0, total - projects.value.length);
});

const roleLabel = (role: string) => {
	const projectRole = role.replace('project:', '');
	return projectRole.charAt(0).toUpperCase() + projectRole.slice(1);
};

onMounted(async () => {
	if (!workspacesStore.loaded) await workspacesStore.fetchWorkspaces();
});
</script>

<template>
	<div :class="$style.page" data-test-id="workspace-projects-view">
		<div :class="$style.content">
			<ProjectHeader />
			<N8nEmptyState
				v-if="projects.length === 0"
				:heading="i18n.baseText('workspaces.projects.empty.heading')"
				:description="i18n.baseText('workspaces.projects.empty.description')"
			/>
			<div v-else :class="$style.grid">
				<RouterLink
					v-for="project in projects"
					:key="project.id"
					:to="{ name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: project.id } }"
					:class="$style.cardLink"
					data-test-id="workspace-project-card"
				>
					<N8nCard :class="$style.card" hoverable>
						<div :class="$style.cardBody">
							<ProjectIcon
								:icon="
									project.type === ProjectTypes.Personal
										? { type: 'icon', value: 'house' }
										: (project.icon ?? DEFAULT_PROJECT_ICON)
								"
								size="large"
							/>
							<div :class="$style.cardText">
								<N8nText bold size="large">
									{{
										project.type === ProjectTypes.Personal
											? i18n.baseText('workspaces.menu.personalProject')
											: project.name
									}}
								</N8nText>
								<N8nText size="small" color="text-light">
									{{
										project.role.startsWith('project:')
											? i18n.baseText('workspaces.browse.role', {
													interpolate: { role: roleLabel(project.role) },
												})
											: project.description
									}}
								</N8nText>
							</div>
							<N8nIcon icon="chevron-right" color="text-light" />
						</div>
					</N8nCard>
				</RouterLink>
			</div>
			<N8nText v-if="hiddenCount > 0" size="small" color="text-light" :class="$style.hidden">
				{{
					i18n.baseText('workspaces.projects.noAccess', {
						interpolate: { count: String(hiddenCount) },
					})
				}}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: grid;
	width: 100%;
	justify-items: center;
	grid-auto-rows: max-content;
	overflow: auto;
}

.content {
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) var(--spacing--2xl);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
}

.cardLink {
	color: inherit;
	text-decoration: none;
}

.card {
	height: 100%;
}

.cardBody {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.cardText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.hidden {
	display: block;
	padding-top: var(--spacing--sm);
}
</style>
