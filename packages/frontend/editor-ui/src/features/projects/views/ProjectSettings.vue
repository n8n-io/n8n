<script lang="ts" setup>
import type { ProjectRole } from '@n8n/permissions';
import { computed, ref, watch, onBeforeMount, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { deepCopy } from 'n8n-workflow';
import { useDebounceFn } from '@vueuse/core';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@n8n/i18n';
import { type ResourceCounts, useProjectsStore } from '../projects.store';
import type { Project, ProjectRelation, ProjectMemberData } from '../projects.types';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import ProjectDeleteDialog from '../components/ProjectDeleteDialog.vue';
import ProjectRoleUpgradeDialog from '../components/ProjectRoleUpgradeDialog.vue';
import ProjectMembersTable from '../components/ProjectMembersTable.vue';
import { useRolesStore } from '@/stores/roles.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import ProjectHeader from '../components/ProjectHeader.vue';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import type { UserAction } from '@n8n/design-system';
import { isProjectRole } from '@/utils/typeGuards';

import {
	N8nButton,
	N8nFormInput,
	N8nIcon,
	N8nIconPicker,
	N8nInput,
	N8nText,
	N8nUserSelect,
} from '@n8n/design-system';
type FormDataDiff = {
	name?: string;
	description?: string;
	role?: ProjectRelation[];
	memberAdded?: ProjectRelation[];
	memberRemoved?: ProjectRelation[];
};

const usersStore = useUsersStore();
const i18n = useI18n();
const projectsStore = useProjectsStore();
const rolesStore = useRolesStore();
const cloudPlanStore = useCloudPlanStore();
const toast = useToast();
const router = useRouter();
const telemetry = useTelemetry();
const documentTitle = useDocumentTitle();

const showSaveError = (error: Error) => {
	toast.showError(error, i18n.baseText('projects.settings.save.error.title'));
};

const dialogVisible = ref(false);
const upgradeDialogVisible = ref(false);

const isDirty = ref(false);
const isValid = ref(false);
const resourceCounts = ref<ResourceCounts>({
	credentials: -1,
	dataTables: -1,
	workflows: -1,
});
const formData = ref<Pick<Project, 'name' | 'description' | 'relations'>>({
	name: '',
	description: '',
	relations: [],
});
// Used to skip one watcher sync after targeted server updates (e.g., immediate removal)
const suppressNextSync = ref(false);

const projectRoleTranslations = ref<{ [key: string]: string }>({
	'project:viewer': i18n.baseText('projects.settings.role.viewer'),
	'project:editor': i18n.baseText('projects.settings.role.editor'),
	'project:admin': i18n.baseText('projects.settings.role.admin'),
});
const nameInput = ref<InstanceType<typeof N8nFormInput> | null>(null);

const projectIcon = ref<IconOrEmoji>({
	type: 'icon',
	value: 'layers',
});

const search = ref('');
const membersTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [
		{ id: 'firstName', desc: false },
		{ id: 'lastName', desc: false },
		{ id: 'email', desc: false },
	],
});

const usersList = computed(() =>
	usersStore.allUsers.filter((user) => {
		const isAlreadySharedWithUser = (formData.value.relations || []).find((r) => r.id === user.id);

		return !isAlreadySharedWithUser;
	}),
);

const projects = computed(() =>
	projectsStore.availableProjects.filter(
		(project) => project.id !== projectsStore.currentProjectId,
	),
);
const projectRoles = computed(() =>
	rolesStore.processedProjectRoles.map((role) => ({
		...role,
		displayName: projectRoleTranslations.value[role.slug] ?? role.displayName,
	})),
);
const firstLicensedRole = computed(() => projectRoles.value.find((role) => role.licensed)?.slug);

const projectMembersActions = computed<Array<UserAction<ProjectMemberData>>>(() => [
	{
		label: i18n.baseText('projects.settings.table.row.removeUser'),
		value: 'remove',
		guard: (member) =>
			member.id !== usersStore.currentUser?.id && member.role !== 'project:personalOwner',
	},
]);

const onAddMember = async (userId: string) => {
	if (!projectsStore.currentProject) return;
	const user = usersStore.usersById[userId];
	if (!user) return;

	const role = firstLicensedRole.value;
	if (!role) return;

	// Optimistically update UI
	if (!formData.value.relations.find((r) => r.id === userId)) {
		formData.value.relations.push({ id: userId, role });
	}

	try {
		suppressNextSync.value = true;
		await projectsStore.addMember(projectsStore.currentProject.id, { userId, role });
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('projects.settings.member.added.title'),
		});
		telemetry.track('User added member to project', {
			project_id: projectsStore.currentProject.id,
			target_user_id: userId,
			role,
		});
	} catch (error) {
		// Rollback optimistic change
		formData.value.relations = formData.value.relations.filter((r) => r.id !== userId);
		showSaveError(error);
	}
};

const onUpdateMemberRole = async ({ userId, role }: { userId: string; role: ProjectRole }) => {
	if (!projectsStore.currentProject) {
		return;
	}

	const memberIndex = formData.value.relations.findIndex((r) => r.id === userId);
	if (memberIndex === -1) {
		return;
	}

	// Store original role for rollback
	const originalRole = formData.value.relations[memberIndex].role;

	// Update UI optimistically
	formData.value.relations[memberIndex].role = role;

	try {
		suppressNextSync.value = true;
		await projectsStore.updateMemberRole(projectsStore.currentProject.id, userId, role);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('projects.settings.memberRole.updated.title'),
		});
		telemetry.track('User changed member role on project', {
			project_id: projectsStore.currentProject.id,
			target_user_id: userId,
			role,
		});
	} catch (error) {
		// Rollback to original role on API failure
		formData.value.relations[memberIndex].role = originalRole;
		toast.showError(error, i18n.baseText('projects.settings.memberRole.update.error.title'));
	}
};

const onTextInput = () => {
	isDirty.value = true;
};

async function onRemoveMember(userId: string) {
	const current = projectsStore.currentProject;
	if (!current) return;

	const idx = formData.value.relations.findIndex((r) => r.id === userId);
	if (idx === -1) return;

	// Optimistically remove from UI
	const removed = formData.value.relations.splice(idx, 1)[0];

	// Only persist if user existed in server relations
	const isPersisted = current.relations.some((r) => r.id === userId);
	if (!isPersisted) return;

	try {
		// Prevent next sync from wiping unsaved edits
		suppressNextSync.value = true;
		await projectsStore.removeMember(current.id, userId);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('projects.settings.member.removed.title'),
		});
		telemetry.track('User removed member from project', {
			project_id: current.id,
			target_user_id: userId,
		});
	} catch (error) {
		formData.value.relations.splice(idx, 0, removed);
		showSaveError(error);
	}
}

const onMembersListAction = async ({ action, userId }: { action: string; userId: string }) => {
	switch (action) {
		case 'remove':
			await onRemoveMember(userId);
			break;
		default:
			// no-op for now; future actions can be added here
			break;
	}
};

const resetFormData = () => {
	formData.value.relations = projectsStore.currentProject?.relations
		? deepCopy(projectsStore.currentProject.relations)
		: [];
	formData.value.name = projectsStore.currentProject?.name ?? '';
	formData.value.description = projectsStore.currentProject?.description ?? '';
};

const onCancel = () => {
	resetFormData();
	isDirty.value = false;
};

const makeFormDataDiff = (): FormDataDiff => {
	const diff: FormDataDiff = {};
	if (!projectsStore.currentProject) {
		return diff;
	}

	if (formData.value.name !== projectsStore.currentProject.name) {
		diff.name = formData.value.name ?? '';
	}

	if (formData.value.description !== projectsStore.currentProject.description) {
		diff.description = formData.value.description ?? '';
	}

	if (formData.value.relations.length !== projectsStore.currentProject.relations.length) {
		diff.memberAdded = formData.value.relations.filter(
			(r) => !projectsStore.currentProject?.relations.find((cr) => cr.id === r.id),
		);
		diff.memberRemoved = projectsStore.currentProject.relations.filter(
			(cr) => !formData.value.relations.find((r) => r.id === cr.id),
		);
	}

	diff.role = formData.value.relations.filter((r) => {
		const currentRelation = projectsStore.currentProject?.relations.find((cr) => cr.id === r.id);
		return currentRelation?.role !== r.role && !diff.memberAdded?.find((ar) => ar.id === r.id);
	});

	return diff;
};

const sendTelemetry = (diff: FormDataDiff) => {
	const projectId = projectsStore.currentProject?.id;

	if (diff.name) {
		telemetry.track('User changed project name', { project_id: projectId, name: diff.name });
	}

	diff.memberAdded?.forEach((r) => {
		telemetry.track('User added member to project', {
			project_id: projectId,
			target_user_id: r.id,
			role: r.role,
		});
	});

	diff.memberRemoved?.forEach((r) => {
		telemetry.track('User removed member from project', {
			project_id: projectId,
			target_user_id: r.id,
		});
	});

	diff.role?.forEach((r) => {
		telemetry.track('User changed member role on project', {
			project_id: projectId,
			target_user_id: r.id,
			role: r.role,
		});
	});
};

const updateProject = async () => {
	if (!projectsStore.currentProject) {
		return;
	}
	try {
		await projectsStore.updateProject(projectsStore.currentProject.id, {
			name: formData.value.name ?? '',
			description: formData.value.description ?? '',
		});
		isDirty.value = false;
	} catch (error) {
		showSaveError(error);
		throw error;
	}
};

const onSubmit = async () => {
	if (!isDirty.value) {
		return;
	}
	try {
		await updateProject();
		const diff = makeFormDataDiff();
		sendTelemetry(diff);
		toast.showMessage({
			title: i18n.baseText('projects.settings.save.successful.title', {
				interpolate: { projectName: formData.value.name ?? '' },
			}),
			type: 'success',
		});
	} catch (error) {
		// Error already handled and displayed by updateProject()
		// Just prevent success toast/telemetry from executing
	}
};

const onDelete = async () => {
	await projectsStore.getAvailableProjects();

	if (projectsStore.currentProjectId) {
		resourceCounts.value = await projectsStore.getResourceCounts(projectsStore.currentProjectId);
	}

	dialogVisible.value = true;
};

const onConfirmDelete = async (transferId?: string) => {
	try {
		if (projectsStore.currentProject) {
			const projectName = projectsStore.currentProject?.name ?? '';
			await projectsStore.deleteProject(projectsStore.currentProject.id, transferId);
			await router.push({ name: VIEWS.HOMEPAGE });
			toast.showMessage({
				title: i18n.baseText('projects.settings.delete.successful.title', {
					interpolate: { projectName },
				}),
				type: 'success',
			});
			dialogVisible.value = true;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.delete.error.title'));
	}
};

const selectProjectNameIfMatchesDefault = () => {
	if (formData.value.name === i18n.baseText('projects.settings.newProjectName')) {
		nameInput.value?.inputRef?.focus();
		nameInput.value?.inputRef?.select();
	}
};

const onIconUpdated = async () => {
	if (!projectsStore.currentProject) return;
	try {
		await projectsStore.updateProject(projectsStore.currentProject.id, {
			icon: projectIcon.value,
		});
		toast.showMessage({
			title: i18n.baseText('projects.settings.icon.update.successful.title'),
			type: 'success',
		});
	} catch (error) {
		showSaveError(error);
	}
};

// Skip one sync after targeted updates (e.g. removal) to preserve unsaved edits
watch(
	() => projectsStore.currentProject,
	async () => {
		if (suppressNextSync.value) {
			suppressNextSync.value = false;
			return;
		}
		resetFormData();
		await nextTick();
		selectProjectNameIfMatchesDefault();
		if (projectsStore.currentProject?.icon && isIconOrEmoji(projectsStore.currentProject.icon)) {
			projectIcon.value = projectsStore.currentProject.icon;
		}
	},
	{ immediate: true },
);

// Add users property to the relation objects,
// So that the table has access to the full user data
const relationUsers = computed(() =>
	formData.value.relations.map((relation) => {
		const user = usersStore.usersById[relation.id];
		const safeRole = isProjectRole(relation.role) ? relation.role : 'project:viewer';

		return {
			...user,
			...relation,
			role: safeRole,
			firstName: user?.firstName ?? null,
			lastName: user?.lastName ?? null,
			email: user?.email ?? null,
		};
	}),
);

const membersTableData = computed(() => ({
	items: relationUsers.value,
	count: relationUsers.value.length,
}));

const filteredMembersData = computed(() => {
	if (!search.value.trim()) return membersTableData.value;

	const searchTerm = search.value.toLowerCase();
	const filtered = relationUsers.value.filter((member) => {
		const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.toLowerCase();
		const email = (member.email ?? '').toLowerCase();
		return fullName.includes(searchTerm) || email.includes(searchTerm);
	});

	return { items: filtered, count: filtered.length };
});

const debouncedSearch = useDebounceFn(() => {
	membersTableState.value.page = 0; // Reset to first page on search
}, 300);

const onSearch = (value: string) => {
	search.value = value;
	void debouncedSearch();
};

const onUpdateMembersTableOptions = (options: TableOptions) => {
	membersTableState.value = options;
};

onBeforeMount(async () => {
	await usersStore.fetchUsers();
});

onMounted(() => {
	documentTitle.set(i18n.baseText('projects.settings'));
	selectProjectNameIfMatchesDefault();
});
</script>

<template>
	<div :class="$style.projectSettings" data-test-id="project-settings-container">
		<div :class="$style.header">
			<ProjectHeader />
			<N8nText tag="h1" size="xlarge" class="pt-xs pb-m">
				{{ i18n.baseText('projects.settings.info') }}
			</N8nText>
		</div>
		<form @submit.prevent="onSubmit">
			<fieldset>
				<label for="projectName">{{ i18n.baseText('projects.settings.name') }}</label>
				<div :class="$style.projectName">
					<N8nIconPicker
						v-model="projectIcon"
						:button-tooltip="i18n.baseText('projects.settings.iconPicker.button.tooltip')"
						@update:model-value="onIconUpdated"
					/>
					<N8nFormInput
						id="projectName"
						ref="nameInput"
						v-model="formData.name"
						label=""
						type="text"
						name="name"
						required
						data-test-id="project-settings-name-input"
						:class="$style.projectNameInput"
						@enter="onSubmit"
						@input="onTextInput"
						@validate="isValid = $event"
					/>
				</div>
			</fieldset>
			<fieldset>
				<label for="projectDescription">{{ i18n.baseText('projects.settings.description') }}</label>
				<N8nFormInput
					id="projectDescription"
					v-model="formData.description"
					label=""
					name="description"
					type="textarea"
					:maxlength="512"
					:autosize="true"
					data-test-id="project-settings-description-input"
					:class="$style.projectDescriptionInput"
					@enter="onSubmit"
					@input="onTextInput"
					@validate="isValid = $event"
				/>
			</fieldset>
			<fieldset v-if="isDirty" :class="$style.buttons">
				<div>
					<small class="mr-2xs">{{
						i18n.baseText('projects.settings.message.unsavedChanges')
					}}</small>
					<N8nButton
						type="secondary"
						native-type="button"
						class="mr-2xs"
						data-test-id="project-settings-cancel-button"
						@click.stop.prevent="onCancel"
						>{{ i18n.baseText('projects.settings.button.cancel') }}</N8nButton
					>
				</div>
				<N8nButton
					:disabled="!isValid"
					type="primary"
					data-test-id="project-settings-save-button"
					>{{ i18n.baseText('projects.settings.button.save') }}</N8nButton
				>
			</fieldset>
			<fieldset>
				<h3>
					<label for="projectMembers">{{
						i18n.baseText('projects.settings.projectMembers')
					}}</label>
				</h3>
				<N8nUserSelect
					id="projectMembers"
					:class="$style.userSelect"
					class="mb-s"
					size="large"
					:users="usersList"
					:current-user-id="usersStore.currentUser?.id"
					:placeholder="i18n.baseText('workflows.shareModal.select.placeholder')"
					data-test-id="project-members-select"
					@update:model-value="onAddMember"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nUserSelect>
				<div v-if="relationUsers.length > 0" :class="$style.membersTableContainer">
					<N8nInput
						:class="$style.search"
						:model-value="search"
						:placeholder="i18n.baseText('projects.settings.members.search.placeholder')"
						clearable
						data-test-id="project-members-search"
						@update:model-value="onSearch"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<ProjectMembersTable
						v-model:table-options="membersTableState"
						data-test-id="project-members-table"
						:data="filteredMembersData"
						:current-user-id="usersStore.currentUser?.id"
						:project-roles="projectRoles"
						:actions="projectMembersActions"
						@update:options="onUpdateMembersTableOptions"
						@update:role="onUpdateMemberRole"
						@action="onMembersListAction"
						@show-upgrade-dialog="upgradeDialogVisible = true"
					/>
				</div>
			</fieldset>
			<fieldset>
				<h3 class="mb-xs">{{ i18n.baseText('projects.settings.danger.title') }}</h3>
				<small>{{ i18n.baseText('projects.settings.danger.message') }}</small>
				<br />
				<N8nButton
					type="tertiary"
					native-type="button"
					class="mt-s"
					data-test-id="project-settings-delete-button"
					@click.stop.prevent="onDelete"
					>{{ i18n.baseText('projects.settings.danger.deleteProject') }}</N8nButton
				>
			</fieldset>
		</form>
		<ProjectDeleteDialog
			v-model="dialogVisible"
			:current-project="projectsStore.currentProject"
			:resource-counts="resourceCounts"
			:projects="projects"
			@confirm-delete="onConfirmDelete"
		/>
		<ProjectRoleUpgradeDialog
			v-model="upgradeDialogVisible"
			:limit="projectsStore.teamProjectsLimit"
			:plan-name="cloudPlanStore.currentPlanData?.displayName"
		/>
	</div>
</template>

<style lang="scss" module>
.projectSettings {
	--project-field-width: 560px;

	display: grid;
	width: 100%;
	justify-items: center;
	grid-auto-rows: max-content;

	form {
		width: 100%;
		max-width: var(--content-container-width);
		padding: 0 var(--spacing--2xl);

		fieldset {
			padding-bottom: var(--spacing--xl);

			h3 {
				label {
					font-size: var(--font-size--lg);
				}
			}

			label {
				display: block;
				margin-bottom: var(--spacing--xs);
				font-size: var(--font-size--sm);
			}
		}
	}
}

.header {
	width: 100%;
	max-width: var(--content-container-width);
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
}

.upgrade {
	cursor: pointer;
}

.buttons {
	display: flex;
	justify-content: flex-start;
	align-items: center;
}

.membersTableContainer {
	margin-top: var(--spacing--sm);
}

.search {
	max-width: var(--project-field-width);
	margin-bottom: var(--spacing--sm);
}

.projectName {
	display: flex;
	gap: var(--spacing--2xs);
	max-width: var(--project-field-width);

	.projectNameInput {
		flex: 1;
	}
}

.projectDescriptionInput,
.userSelect {
	max-width: var(--project-field-width);
	width: 100%;
}

/* Ensure textarea uses regular UI font, not monospace */
.projectDescriptionInput :global(textarea) {
	font-family: var(--font-family);
}
</style>
