<script lang="ts" setup>
/**
 * PROTOTYPE (workspaces): every workspace on the instance. Instance admins
 * join and leave freely; joining only adds the workspace to their sidebar.
 * Other users join public workspaces and request access to private ones.
 */
import { MODAL_CONFIRM } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import type { WorkspaceListItem } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nInput,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import ProjectIcon from '../components/ProjectIcon.vue';
import WorkspaceRequestAccessDialog from '../components/WorkspaceRequestAccessDialog.vue';
import { DEFAULT_WORKSPACE_ICON, WORKSPACE_PROJECTS_VIEW } from '../projects.constants';
import { useProjectsStore } from '../projects.store';
import { useWorkspacesStore } from '../workspaces.store';

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const workspacesStore = useWorkspacesStore();

const search = ref('');
const busyId = ref<string | null>(null);
const requestTarget = ref<WorkspaceListItem | null>(null);

const isInstanceAdmin = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).project.read ?? false,
);
const canCreateWorkspace = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'project:create' } }),
);

/**
 * PROTOTYPE (workspaces): a private workspace that exists only in the browser, so
 * every user, also an instance admin, can see the "Request access" flow.
 */
const demoPrivateWorkspace = computed<WorkspaceListItem>(() => ({
	id: 'demo-private-workspace',
	name: i18n.baseText('workspaces.demo.name'),
	icon: { type: 'emoji', value: '⚖️' },
	description: i18n.baseText('workspaces.demo.description'),
	type: 'workspace',
	joined: false,
	isMember: false,
	role: null,
	projectCount: 4,
	memberCount: 6,
	isPublic: false,
	cascadeMembers: false,
	adminNames: ['Priya Patel', 'Marcus Chen'],
	canJoin: false,
	canLeave: false,
	canRequestAccess: true,
	canCreateProject: false,
}));

const visible = computed(() => {
	const term = search.value.trim().toLowerCase();
	return [...workspacesStore.teamWorkspaces, demoPrivateWorkspace.value]
		.filter((w) => !term || w.name.toLowerCase().includes(term))
		.sort((a, b) => a.name.localeCompare(b.name));
});

const canOpen = (workspace: WorkspaceListItem) =>
	projectsStore.myProjects.some((p) => p.id === workspace.id);

const roleLabel = (role: string) => {
	const projectRole = role.replace('project:', '');
	return projectRole.charAt(0).toUpperCase() + projectRole.slice(1);
};

async function run(workspace: WorkspaceListItem, action: 'join' | 'leave') {
	busyId.value = workspace.id;
	try {
		await workspacesStore[action](workspace.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText(
				action === 'join' ? 'workspaces.join.success' : 'workspaces.leave.success',
				{
					interpolate: { name: workspace.name },
				},
			),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.error.title'));
	} finally {
		busyId.value = null;
	}
}

function onRequestSubmitted({ workspaceId }: { workspaceId: string }) {
	const workspace = visible.value.find((w) => w.id === workspaceId);
	workspacesStore.requestAccess(workspaceId);
	requestTarget.value = null;
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('workspaces.request.success.title'),
		message: i18n.baseText('workspaces.request.success.message', {
			interpolate: { name: workspace?.name ?? '' },
		}),
	});
}

async function createWorkspace() {
	const response = await message.prompt(
		i18n.baseText('workspaces.create.message'),
		i18n.baseText('workspaces.create.title'),
		{
			confirmButtonText: i18n.baseText('generic.create'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValidator: (value: string) =>
				value?.trim() ? true : i18n.baseText('workspaces.projects.nameRequired'),
		},
	);
	if (response.action !== MODAL_CONFIRM) return;
	try {
		const workspace = await workspacesStore.createWorkspace({ name: response.value.trim() });
		toast.showMessage({ type: 'success', title: i18n.baseText('workspaces.create.success') });
		await router.push({ name: WORKSPACE_PROJECTS_VIEW, params: { projectId: workspace.id } });
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.error.title'));
	}
}

onMounted(async () => {
	await Promise.all([workspacesStore.fetchWorkspaces(), projectsStore.getMyProjects()]);
});
</script>

<template>
	<div :class="$style.page" data-test-id="workspaces-view">
		<div :class="$style.content">
			<div :class="$style.header">
				<div>
					<N8nHeading tag="h1" size="xlarge" bold>
						{{ i18n.baseText('workspaces.browse.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{
							i18n.baseText(
								isInstanceAdmin
									? 'workspaces.browse.description.admin'
									: 'workspaces.browse.description.member',
							)
						}}
					</N8nText>
				</div>
				<N8nButton
					v-if="canCreateWorkspace"
					icon="plus"
					data-test-id="create-workspace-button"
					@click="createWorkspace"
				>
					{{ i18n.baseText('workspaces.browse.create') }}
				</N8nButton>
			</div>

			<N8nInput
				v-model="search"
				:placeholder="i18n.baseText('workspaces.browse.search')"
				:class="$style.search"
				clearable
				data-test-id="workspaces-search"
			/>

			<N8nText v-if="visible.length === 0" color="text-light">
				{{ i18n.baseText('workspaces.browse.empty') }}
			</N8nText>

			<ul :class="$style.list">
				<li
					v-for="workspace in visible"
					:key="workspace.id"
					:class="$style.row"
					data-test-id="workspace-row"
				>
					<ProjectIcon :icon="workspace.icon ?? DEFAULT_WORKSPACE_ICON" size="large" />
					<div :class="$style.details">
						<div :class="$style.titleLine">
							<RouterLink
								v-if="canOpen(workspace)"
								:to="{ name: WORKSPACE_PROJECTS_VIEW, params: { projectId: workspace.id } }"
								:class="$style.name"
							>
								{{ workspace.name }}
							</RouterLink>
							<N8nText v-else bold>{{ workspace.name }}</N8nText>
							<N8nBadge v-if="workspace.joined" variant="success">
								{{ i18n.baseText('workspaces.browse.joined') }}
							</N8nBadge>
							<N8nBadge
								v-if="!workspace.isPublic"
								leading-icon="lock"
								data-test-id="workspace-private-badge"
							>
								{{ i18n.baseText('workspaces.browse.private') }}
							</N8nBadge>
						</div>
						<N8nText v-if="workspace.description" size="small" color="text-light">
							{{ workspace.description }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('workspaces.browse.projects', {
									interpolate: { count: String(workspace.projectCount) },
								})
							}}
							·
							{{
								i18n.baseText('workspaces.browse.members', {
									interpolate: { count: String(workspace.memberCount) },
								})
							}}
							<template v-if="workspace.role">
								·
								{{
									i18n.baseText('workspaces.browse.role', {
										interpolate: { role: roleLabel(workspace.role) },
									})
								}}
							</template>
							<template v-else-if="workspace.joined && !isInstanceAdmin">
								· {{ i18n.baseText('workspaces.browse.viaProject') }}
							</template>
							<template v-if="workspace.cascadeMembers">
								· {{ i18n.baseText('workspaces.browse.cascade') }}
							</template>
						</N8nText>
					</div>
					<div :class="$style.actions">
						<N8nButton
							v-if="workspace.canJoin"
							:loading="busyId === workspace.id"
							data-test-id="workspace-join-button"
							@click="run(workspace, 'join')"
						>
							{{ i18n.baseText('workspaces.browse.join') }}
						</N8nButton>
						<N8nButton
							v-if="workspace.canLeave"
							variant="subtle"
							:loading="busyId === workspace.id"
							data-test-id="workspace-leave-button"
							@click="run(workspace, 'leave')"
						>
							{{ i18n.baseText('workspaces.browse.leave') }}
						</N8nButton>
						<template v-if="workspace.canRequestAccess">
							<N8nTooltip
								v-if="workspacesStore.hasRequestedAccess(workspace.id)"
								:content="i18n.baseText('workspaces.browse.requestPending.tooltip')"
							>
								<N8nButton
									variant="subtle"
									icon="clock"
									disabled
									data-test-id="workspace-request-pending-button"
								>
									{{ i18n.baseText('workspaces.browse.requestPending') }}
								</N8nButton>
							</N8nTooltip>
							<N8nButton
								v-else
								variant="subtle"
								icon="lock"
								data-test-id="workspace-request-button"
								@click="requestTarget = workspace"
							>
								{{ i18n.baseText('workspaces.browse.requestAccess') }}
							</N8nButton>
						</template>
					</div>
				</li>
			</ul>
		</div>
		<WorkspaceRequestAccessDialog
			:workspace="requestTarget"
			@close="requestTarget = null"
			@submit="onRequestSubmitted"
		/>
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

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding-bottom: var(--spacing--md);
}

.search {
	max-width: 320px;
	margin-bottom: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);

	& + & {
		border-top: var(--border-width) var(--border-style) var(--color--foreground);
	}
}

.details {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.titleLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.name {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);

	&:hover {
		color: var(--color--primary);
	}
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
