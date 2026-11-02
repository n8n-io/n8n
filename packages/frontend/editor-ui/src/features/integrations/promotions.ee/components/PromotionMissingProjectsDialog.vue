<script setup lang="ts">
import { ROLE, type PromotionMissingProject } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nUserSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { PROJECT_ADMIN_ROLE_SLUG } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, reactive, ref } from 'vue';

import { DEBOUNCE_TIME, VIEWS } from '@/app/constants';
import {
	addProjectMembers,
	createPublicProject,
} from '@/features/collaboration/projects/projects.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

type RowState =
	| { status: 'creating' | 'created' | 'already-exists' }
	| { status: 'failed' | 'admin-failed'; message: string };

const props = defineProps<{
	open: boolean;
	environmentName: string;
	projects: PromotionMissingProject[];
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	/** Emitted on close when at least one project now exists. */
	changed: [];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const rolesStore = useRolesStore();
const usersStore = useUsersStore();
const { next: nextSearch } = useLatestFetch();

const selected = reactive(new Set<string>());
const states = reactive(new Map<string, RowState>());
/** The user picked as project admin, by project ID. */
const admins = reactive(new Map<string, string>());
const isSubmitting = ref(false);
const searchResults = ref<IUser[]>([]);
const isLoadingUsers = ref(false);

const description = computed(() =>
	i18n.baseText('settings.promotions.missingProjects.dialog.description', {
		interpolate: { environment: props.environmentName },
	}),
);

const canAssignAdmin = computed(() =>
	rolesStore.processedProjectRoles.some(
		({ slug, licensed }) => slug === PROJECT_ADMIN_ROLE_SLUG && licensed,
	),
);

// Keep the picked users in the options, so each picker keeps its label while a search shows other users.
const userOptions = computed(() => {
	const picked = [...admins.values()].flatMap((id) => usersStore.usersById[id] ?? []);
	return [...new Map([...picked, ...searchResults.value].map((user) => [user.id, user])).values()];
});

const isDone = (id: string) => {
	const status = states.get(id)?.status;
	return status === 'created' || status === 'already-exists';
};

const hasProject = (id: string) => {
	const status = states.get(id)?.status;
	return status === 'created' || status === 'already-exists' || status === 'admin-failed';
};

const isFailed = (id: string) => {
	const status = states.get(id)?.status;
	return status === 'failed' || status === 'admin-failed';
};

const statusLine = (id: string) => {
	const state = states.get(id);
	switch (state?.status) {
		case 'created':
			return {
				color: 'success',
				text: i18n.baseText('settings.promotions.missingProjects.status.created'),
			} as const;
		case 'already-exists':
			return {
				color: 'text-light',
				text: i18n.baseText('settings.promotions.missingProjects.status.alreadyExists'),
			} as const;
		case 'admin-failed':
			return {
				color: 'danger',
				text: i18n.baseText('settings.promotions.missingProjects.status.adminFailed', {
					interpolate: { error: state.message },
				}),
			} as const;
		case 'failed':
			return { color: 'danger', text: state.message } as const;
		default:
			return undefined;
	}
};

const selectable = computed(() => props.projects.filter(({ id }) => !isDone(id)));

const allState = computed(() => {
	if (selected.size === 0) return 'unchecked';
	return selected.size === selectable.value.length ? 'checked' : 'indeterminate';
});

// After a failed run, the button retries the failed rows that are still selected.
const isRetry = computed(() => selected.size > 0 && [...selected].every(isFailed));

const submitLabel = computed(() => {
	// Without a selection, the button shows no count.
	if (selected.size === 0) return i18n.baseText('settings.promotions.missingProjects.button');
	return i18n.baseText(
		isRetry.value
			? 'settings.promotions.missingProjects.dialog.retry'
			: 'settings.promotions.missingProjects.button.count',
		{ adjustToNumber: selected.size, interpolate: { count: String(selected.size) } },
	);
});

function toggle(id: string) {
	if (selected.has(id)) selected.delete(id);
	else selected.add(id);
}

function toggleAll() {
	if (allState.value === 'checked') selected.clear();
	else for (const { id } of selectable.value) selected.add(id);
}

function setAdmin(projectId: string, userId: string) {
	if (userId) admins.set(projectId, userId);
	else admins.delete(projectId);
}

// Instance owners and admins can open every project already, so the backend does not add them.
const canBecomeProjectAdmin = (user: IUser) => user.role !== ROLE.Owner && user.role !== ROLE.Admin;

async function searchUsers(query: string) {
	const isLatest = nextSearch();
	isLoadingUsers.value = true;
	try {
		const fullText = query.trim();
		const users = await usersStore.fetchUsers({ filter: fullText ? { fullText } : undefined });
		if (isLatest()) searchResults.value = users.filter(canBecomeProjectAdmin);
	} catch (error) {
		if (isLatest()) {
			toast.showError(
				error,
				i18n.baseText('settings.promotions.missingProjects.dialog.usersError'),
			);
		}
	} finally {
		if (isLatest()) isLoadingUsers.value = false;
	}
}

const debouncedSearchUsers = useDebounceFn(
	searchUsers,
	getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
);

onMounted(async () => {
	if (canAssignAdmin.value) await searchUsers('');
});

function close() {
	emit('update:open', false);
	if ([...states.keys()].some(hasProject)) emit('changed');
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

async function create(project: PromotionMissingProject): Promise<RowState> {
	try {
		await createPublicProject(rootStore.publicApiContext, project);
		return { status: 'created' };
	} catch (error) {
		// A 409 means another project has this ID already. Nothing was changed.
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			return { status: 'already-exists' };
		}
		return { status: 'failed', message: getErrorMessage(error) };
	}
}

async function assignAdmin(projectId: string): Promise<RowState> {
	const userId = admins.get(projectId);
	if (!userId) return { status: 'created' };
	try {
		await addProjectMembers(rootStore.restApiContext, projectId, [
			{ userId, role: PROJECT_ADMIN_ROLE_SLUG },
		]);
		return { status: 'created' };
	} catch (error) {
		return { status: 'admin-failed', message: getErrorMessage(error) };
	}
}

// The project sidebar reads these, and this page does not reload them.
async function refreshProjects() {
	try {
		await Promise.all([projectsStore.getMyProjects(), projectsStore.getProjectsCount()]);
	} catch {
		// The projects exist. A stale project list is fixed by the next page load.
	}
}

async function submit() {
	if (isSubmitting.value || selected.size === 0) return;
	isSubmitting.value = true;
	let created = 0;
	// One at a time, because each creation checks the team project quota.
	for (const project of props.projects.filter(({ id }) => selected.has(id))) {
		// After a failed assignment, the project exists. The retry only assigns the admin.
		const isNew = states.get(project.id)?.status !== 'admin-failed';
		states.set(project.id, { status: 'creating' });
		let state: RowState = { status: 'created' };
		if (isNew) {
			state = await create(project);
			if (state.status === 'created') created++;
		}
		if (state.status === 'created') state = await assignAdmin(project.id);
		states.set(project.id, state);
		if (isDone(project.id)) selected.delete(project.id);
	}
	isSubmitting.value = false;
	if (created) await refreshProjects();

	if ([...states.keys()].some(isFailed)) return;
	if (created) {
		toast.showMessage({
			title: i18n.baseText('settings.promotions.missingProjects.toast.created', {
				adjustToNumber: created,
				interpolate: { count: String(created) },
			}),
			type: 'success',
		});
	}
	close();
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="xlarge"
		:aria-description="description"
		data-test-id="promotion-missing-projects-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('settings.promotions.missingProjects.dialog.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<N8nDialogBody>
			<form id="promotion-missing-projects-form" :class="$style.form" @submit.prevent="submit">
				<N8nText color="text-base">{{ description }}</N8nText>
				<!-- Not N8nTableBase: it clips its content, which would cut off the admin pickers' dropdowns. -->
				<table :class="$style.table">
					<colgroup>
						<col />
						<col />
						<col v-if="canAssignAdmin" :class="$style.adminColumn" />
					</colgroup>
					<thead>
						<tr>
							<th>
								<N8nCheckbox
									:model-value="allState === 'checked'"
									:indeterminate="allState === 'indeterminate'"
									:disabled="isSubmitting || selectable.length === 0"
									:aria-label="
										i18n.baseText('settings.promotions.missingProjects.dialog.selectAll')
									"
									data-test-id="promotion-missing-projects-select-all"
									@update:model-value="toggleAll"
								/>
							</th>
							<th scope="col">
								{{ i18n.baseText('settings.promotions.missingProjects.dialog.project') }}
							</th>
							<th v-if="canAssignAdmin" scope="col">
								{{ i18n.baseText('settings.promotions.missingProjects.dialog.admin') }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="project in projects"
							:key="project.id"
							:data-test-id="`promotion-missing-project-${project.id}`"
						>
							<td>
								<N8nCheckbox
									v-if="!isDone(project.id)"
									:model-value="selected.has(project.id)"
									:disabled="isSubmitting"
									:aria-label="project.name"
									@update:model-value="toggle(project.id)"
								/>
							</td>
							<td>
								<div :class="$style.project">
									<N8nLink
										v-if="hasProject(project.id)"
										:to="{ name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: project.id } }"
									>
										<N8nText bold>{{ project.name }}</N8nText>
									</N8nLink>
									<N8nText v-else bold color="text-dark">{{ project.name }}</N8nText>
									<N8nIcon
										v-if="states.get(project.id)?.status === 'creating'"
										icon="loader-circle"
										spin
										size="small"
									/>
								</div>
								<N8nText
									v-if="statusLine(project.id)"
									:class="$style.status"
									size="small"
									:color="statusLine(project.id)?.color"
									data-test-id="promotion-missing-project-status"
								>
									{{ statusLine(project.id)?.text }}
								</N8nText>
							</td>
							<td v-if="canAssignAdmin">
								<N8nUserSelect
									:model-value="admins.get(project.id) ?? ''"
									:users="userOptions"
									:current-user-id="usersStore.currentUser?.id"
									:placeholder="
										i18n.baseText('settings.promotions.missingProjects.dialog.adminPlaceholder')
									"
									:disabled="isSubmitting || !selected.has(project.id)"
									:loading="isLoadingUsers"
									:remote-method="debouncedSearchUsers"
									:teleported="false"
									:aria-label="
										i18n.baseText('settings.promotions.missingProjects.dialog.adminLabel', {
											interpolate: { project: project.name },
										})
									"
									size="medium"
									remote
									show-avatar
									clearable
									data-test-id="promotion-missing-project-admin"
									@update:model-value="(userId: string) => setAdmin(project.id, userId)"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				:disabled="isSubmitting"
				data-test-id="promotion-missing-projects-cancel"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				type="submit"
				form="promotion-missing-projects-form"
				:loading="isSubmitting"
				:disabled="selected.size === 0"
				data-test-id="promotion-missing-projects-create"
			>
				{{ submitLabel }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: start;
		vertical-align: middle;
	}

	th {
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
	}

	td {
		border-block-start: var(--border);
	}

	// Shrink the checkbox column to the checkbox.
	th:first-child,
	td:first-child {
		width: 1px;
		padding-inline-end: 0;
	}
}

.adminColumn {
	// Leaves the larger share of the row to the project names.
	width: 45%;
}

.project {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.status {
	display: block;
}
</style>
