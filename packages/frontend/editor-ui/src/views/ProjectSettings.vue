<script lang="ts" setup>
import type { ProjectRole } from '@n8n/permissions';
import { computed, ref, watch, onBeforeMount, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { deepCopy } from 'n8n-workflow';
import { N8nFormInput, N8nInput } from '@n8n/design-system';
import { useDebounceFn } from '@vueuse/core';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project, ProjectRelation } from '@/types/projects.types';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import ProjectDeleteDialog from '@/components/Projects/ProjectDeleteDialog.vue';
import ProjectRoleUpgradeDialog from '@/components/Projects/ProjectRoleUpgradeDialog.vue';
import ProjectMembersTable from '@/components/Projects/ProjectMembersTable.vue';
import { useRolesStore } from '@/stores/roles.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { isProjectRole } from '@/utils/typeGuards';

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

const dialogVisible = ref(false);
const upgradeDialogVisible = ref(false);

const isDirty = ref(false);
const isValid = ref(false);
const isCurrentProjectEmpty = ref(true);
const formData = ref<Pick<Project, 'name' | 'description' | 'relations'>>({
	name: '',
	description: '',
	relations: [],
});

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

const pendingRemovals = ref<Set<string>>(new Set());

const usersList = computed(() =>
	usersStore.allUsers.filter((user: IUser) => {
		const isAlreadySharedWithUser = (formData.value.relations || []).find(
			(r: ProjectRelation) => r.id === user.id,
		);

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

const onAddMember = (userId: string) => {
	isDirty.value = true;
	const user = usersStore.usersById[userId];
	if (!user) return;

	const { id, firstName, lastName, email } = user;
	const relation = { id, firstName, lastName, email } as ProjectRelation;

	if (firstLicensedRole.value) {
		relation.role = firstLicensedRole.value;
	}

	formData.value.relations.push(relation);
};

const onUpdateMemberRole = async ({
	userId,
	role,
}: {
	userId: string;
	role: ProjectRole | 'remove';
}) => {
	if (role === 'remove') {
		// Mark for pending removal instead of immediate removal
		pendingRemovals.value.add(userId);
		isDirty.value = true;
		return;
	}

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
		await projectsStore.updateProject(projectsStore.currentProject.id, {
			name: formData.value.name ?? '',
			icon: projectIcon.value,
			description: formData.value.description ?? '',
			relations: formData.value.relations.map((r: ProjectRelation) => ({
				userId: r.id,
				role: r.role,
			})),
		});

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

const onCancel = () => {
	formData.value.relations = projectsStore.currentProject?.relations
		? deepCopy(projectsStore.currentProject.relations)
		: [];
	formData.value.name = projectsStore.currentProject?.name ?? '';
	formData.value.description = projectsStore.currentProject?.description ?? '';
	pendingRemovals.value.clear();
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
			(r: ProjectRelation) => !projectsStore.currentProject?.relations.find((cr) => cr.id === r.id),
		);
		diff.memberRemoved = projectsStore.currentProject.relations.filter(
			(cr: ProjectRelation) => !formData.value.relations.find((r) => r.id === cr.id),
		);
	}

	diff.role = formData.value.relations.filter((r: ProjectRelation) => {
		const currentRelation = projectsStore.currentProject?.relations.find((cr) => cr.id === r.id);
		return currentRelation?.role !== r.role && !diff.memberAdded?.find((ar) => ar.id === r.id);
	});

	return diff;
};

const sendTelemetry = (diff: FormDataDiff) => {
	if (diff.name) {
		telemetry.track('User changed project name', {
			project_id: projectsStore.currentProject?.id,
			name: diff.name,
		});
	}

	if (diff.memberAdded) {
		diff.memberAdded.forEach((r) => {
			telemetry.track('User added member to project', {
				project_id: projectsStore.currentProject?.id,
				target_user_id: r.id,
				role: r.role,
			});
		});
	}

	if (diff.memberRemoved) {
		diff.memberRemoved.forEach((r) => {
			telemetry.track('User removed member from project', {
				project_id: projectsStore.currentProject?.id,
				target_user_id: r.id,
			});
		});
	}

	if (diff.role) {
		diff.role.forEach((r) => {
			telemetry.track('User changed member role on project', {
				project_id: projectsStore.currentProject?.id,
				target_user_id: r.id,
				role: r.role,
			});
		});
	}
};

const updateProject = async () => {
	if (!projectsStore.currentProject) {
		return;
	}
	try {
		if (formData.value.relations.some((r) => r.role === 'project:personalOwner')) {
			throw new Error('Invalid role selected for this project.');
		}

		// Remove pending removal members from relations before saving
		const relationsToSave = formData.value.relations.filter(
			(r: ProjectRelation) => !pendingRemovals.value.has(r.id),
		);

		await projectsStore.updateProject(projectsStore.currentProject.id, {
			name: formData.value.name ?? '',
			icon: projectIcon.value,
			description: formData.value.description ?? '',
			relations: relationsToSave.map((r: ProjectRelation) => ({
				userId: r.id,
				role: r.role,
			})),
		});

		// After successful save, actually remove pending members from formData
		formData.value.relations = relationsToSave;
		pendingRemovals.value.clear();
		isDirty.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.save.error.title'));
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
		isCurrentProjectEmpty.value = await projectsStore.isProjectEmpty(
			projectsStore.currentProjectId,
		);
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
	await updateProject();
	toast.showMessage({
		title: i18n.baseText('projects.settings.icon.update.successful.title'),
		type: 'success',
	});
};

watch(
	() => projectsStore.currentProject,
	async () => {
		formData.value.name = projectsStore.currentProject?.name ?? '';
		formData.value.description = projectsStore.currentProject?.description ?? '';
		formData.value.relations = projectsStore.currentProject?.relations
			? deepCopy(projectsStore.currentProject.relations)
			: [];
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
// Filter out users marked for pending removal
const relationUsers = computed(() =>
	formData.value.relations
		.filter((relation: ProjectRelation) => !pendingRemovals.value.has(relation.id))
		.map((relation: ProjectRelation) => {
			const user = usersStore.usersById[relation.id];
			// Ensure type safety for UI display while preserving original role in formData
			const safeRole: ProjectRole = isProjectRole(relation.role) ? relation.role : 'project:viewer';

			if (!user) {
				return {
					...relation,
					role: safeRole,
					firstName: null,
					lastName: null,
					email: null,
				};
			}
			return {
				...user,
				...relation,
				role: safeRole,
			};
		}),
);

const membersTableData = computed(() => ({
	items: relationUsers.value,
	count: relationUsers.value.length,
}));

const filteredMembersData = computed(() => {
	if (!search.value.trim()) {
		return membersTableData.value;
	}
	const searchTerm = search.value.toLowerCase();
	const filtered = relationUsers.value.filter((member) => {
		const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
		const email = (member.email || '').toLowerCase();
		return fullName.includes(searchTerm) || email.includes(searchTerm);
	});
	return {
		items: filtered,
		count: filtered.length,
	};
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
		</div>
		<form @submit.prevent="onSubmit">
			<fieldset>
				<label for="projectName">{{ i18n.baseText('projects.settings.name') }}</label>
				<div :class="$style['project-name']">
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
						:class="$style['project-name-input']"
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
					@enter="onSubmit"
					@input="onTextInput"
					@validate="isValid = $event"
				/>
			</fieldset>
			<fieldset>
				<label for="projectMembers">{{ i18n.baseText('projects.settings.projectMembers') }}</label>
				<N8nUserSelect
					id="projectMembers"
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
						@update:options="onUpdateMembersTableOptions"
						@update:role="onUpdateMemberRole"
					/>
				</div>
			</fieldset>
			<fieldset :class="$style.buttons">
				<div>
					<small v-if="isDirty" class="mr-2xs">{{
						i18n.baseText('projects.settings.message.unsavedChanges')
					}}</small>
					<N8nButton
						:disabled="!isDirty"
						type="secondary"
						native-type="button"
						class="mr-2xs"
						data-test-id="project-settings-cancel-button"
						@click.stop.prevent="onCancel"
						>{{ i18n.baseText('projects.settings.button.cancel') }}</N8nButton
					>
				</div>
				<N8nButton
					:disabled="!isDirty || !isValid"
					type="primary"
					data-test-id="project-settings-save-button"
					>{{ i18n.baseText('projects.settings.button.save') }}</N8nButton
				>
			</fieldset>
			<fieldset>
				<hr class="mb-2xl" />
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
			:is-current-project-empty="isCurrentProjectEmpty"
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
	display: grid;
	width: 100%;
	justify-items: center;
	grid-auto-rows: max-content;

	form {
		width: 100%;
		max-width: var(--content-container-width);
		padding: 0 var(--spacing-2xl);

		fieldset {
			padding-bottom: var(--spacing-2xl);

			label {
				display: block;
				margin-bottom: var(--spacing-xs);
				font-size: var(--font-size-xl);
			}
		}
	}
}

.header {
	width: 100%;
	max-width: var(--content-container-width);
	padding: var(--spacing-l) var(--spacing-2xl) 0;
}

.upgrade {
	cursor: pointer;
}

.buttons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.membersTableContainer {
	margin-top: var(--spacing-s);
}

.search {
	max-width: 300px;
	margin-bottom: var(--spacing-s);
}

.project-name {
	display: flex;
	gap: var(--spacing-2xs);

	.project-name-input {
		flex: 1;
	}
}
</style>
