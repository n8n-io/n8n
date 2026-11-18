<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type { ProjectRole, RoleDef, User } from '@/features/projectSettingsPrototype/data/types';
import {
	CURRENT_USER_ID,
	INSTANCE_ROLE_LABELS,
	PROJECT_ROLES,
	USERS,
	fullName,
	roleLabel,
	userById,
} from '@/features/projectSettingsPrototype/data/users';
import {
	currentUser as sessionUser,
	useCan,
} from '@/features/projectSettingsPrototype/state/session';
import {
	addMembers,
	membersOf,
	removeMember,
	setMemberRole,
} from '@/features/projectSettingsPrototype/state/store';

const props = defineProps<{ projectId: string }>();

interface Person {
	id: string;
	firstName: string;
	lastName: string;
	name: string;
	email: string;
	isCurrent: boolean;
	instanceRole: User['instanceRole'];
}

interface MemberRow extends Person {
	role: ProjectRole;
	roleDef: RoleDef | undefined;
	/** Instance owners and admins reach every project, whatever their project role. */
	instanceNote: string | undefined;
}

const DEFAULT_ROLE: ProjectRole = 'project:editor';
const INSTANCE_NOTE_HINT = 'Instance owners and admins have full access to every project.';

const can = useCan();
const toast = useToast();
const usersStore = useUsersStore();

const canEdit = computed(() => can('project:members:edit'));

const roleDefById = (role: ProjectRole) => PROJECT_ROLES.find((entry) => entry.id === role);

/** A fixture user. The person using the prototype shows as the signed-in user. */
function personFor(userId: string): Person {
	const fixture = userById(userId);
	if (userId !== CURRENT_USER_ID) {
		return { ...fixture, name: fullName(fixture), isCurrent: false };
	}

	const real = usersStore.currentUser;
	const hasRealName = Boolean(real?.firstName) || Boolean(real?.lastName);
	const firstName = hasRealName ? (real?.firstName ?? '') : fixture.firstName;
	const lastName = hasRealName ? (real?.lastName ?? '') : fixture.lastName;
	return {
		id: userId,
		firstName,
		lastName,
		name: fullName({ firstName, lastName }).trim(),
		email: real?.email ?? fixture.email,
		isCurrent: true,
		instanceRole: sessionUser.value.instanceRole,
	};
}

/** The current user first, as `membersOf` returns them. */
const rows = computed<MemberRow[]>(() =>
	membersOf(props.projectId).map((member) => {
		const person = personFor(member.userId);
		return {
			...person,
			role: member.role,
			roleDef: roleDefById(member.role),
			instanceNote:
				person.instanceRole === 'member'
					? undefined
					: `Instance ${INSTANCE_ROLE_LABELS[person.instanceRole].toLowerCase()}`,
		};
	}),
);

/* ── Search ───────────────────────────────────────────────────────────── */

const search = ref('');

/** Lowercase and without accents, so "tomas" finds "Tomás". */
const normalize = (value: string) =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');

const query = computed(() => normalize(search.value.trim()));

const filteredRows = computed(() => {
	if (!query.value) return rows.value;
	return rows.value.filter(
		(row) =>
			normalize(row.name).includes(query.value) || normalize(row.email).includes(query.value),
	);
});

const countLabel = computed(() => {
	const total = rows.value.length;
	const noun = total === 1 ? 'member' : 'members';
	return query.value
		? `${formatNumber(filteredRows.value.length)} of ${formatNumber(total)} ${noun}`
		: `${formatNumber(total)} ${noun}`;
});

/* ── Role and removal ─────────────────────────────────────────────────── */

function onRoleChange(row: MemberRow, value: unknown) {
	const role = PROJECT_ROLES.find((entry) => entry.id === value)?.id;
	if (!role || role === row.role) return;
	setMemberRole(props.projectId, row.id, role);
	toast.showMessage({
		title: `Changed ${row.name}'s role to ${roleLabel(role)}`,
		type: 'success',
	});
}

function onRemove(row: MemberRow) {
	removeMember(props.projectId, row.id);
	toast.showMessage({ title: `Removed ${row.name} from the project`, type: 'success' });
}

/* ── Add members ──────────────────────────────────────────────────────── */

const isAddOpen = ref(false);
const pickedIds = ref<string[]>([]);
const pickedRole = ref<ProjectRole>(DEFAULT_ROLE);

/** Everyone on the instance who isn't in the project yet. */
const candidates = computed(() => {
	const memberIds = new Set(rows.value.map((row) => row.id));
	return USERS.filter((user) => !memberIds.has(user.id)).map((user) => ({
		...user,
		name: fullName(user),
	}));
});

function openAdd() {
	pickedIds.value = [];
	pickedRole.value = DEFAULT_ROLE;
	isAddOpen.value = true;
}

function confirmAdd() {
	const userIds = [...pickedIds.value];
	if (userIds.length === 0) return;

	const role = pickedRole.value;
	addMembers(props.projectId, userIds, role);
	toast.showMessage({
		title:
			userIds.length === 1
				? `Added ${fullName(userById(userIds[0]))} as ${roleLabel(role)}`
				: `Added ${userIds.length} members as ${roleLabel(role)}`,
		type: 'success',
	});
	isAddOpen.value = false;
}
</script>

<template>
	<div :class="$style.page" data-test-id="proto-members-page">
		<section :class="$style.section">
			<div :class="$style.toolbar">
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					placeholder="Search by name or email"
					aria-label="Search members"
					clearable
					data-test-id="proto-members-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nText
					:class="$style.count"
					size="small"
					color="text-light"
					data-test-id="proto-members-count"
				>
					{{ countLabel }}
				</N8nText>
				<N8nButton v-if="canEdit" data-test-id="proto-members-add" @click="openAdd">
					<template #icon>
						<N8nIcon icon="plus" />
					</template>
					Add members
				</N8nButton>
			</div>

			<div :class="$style.tableWrap">
				<table :class="$style.table" data-test-id="proto-members-table">
					<thead>
						<tr>
							<th scope="col">Member</th>
							<th scope="col" :class="$style.roleColumn">Project role</th>
							<th v-if="canEdit" scope="col" :class="$style.actionsColumn" aria-label="Actions" />
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in filteredRows"
							:key="row.id"
							:data-test-id="`proto-member-row-${row.id}`"
						>
							<td>
								<div :class="$style.member">
									<N8nAvatar :first-name="row.firstName" :last-name="row.lastName" size="small" />
									<div :class="$style.memberText">
										<div :class="$style.nameLine">
											<N8nText :class="$style.name" bold color="text-dark">{{ row.name }}</N8nText>
											<N8nText v-if="row.isCurrent" size="small" color="text-light">(you)</N8nText>
											<N8nTooltip
												v-if="row.instanceNote"
												:content="INSTANCE_NOTE_HINT"
												placement="top"
											>
												<N8nText
													:class="$style.instanceNote"
													size="small"
													color="text-light"
													data-test-id="proto-member-instance-role"
												>
													{{ row.instanceNote }}
												</N8nText>
											</N8nTooltip>
										</div>
										<N8nText :class="$style.email" size="small" color="text-light">
											{{ row.email }}
										</N8nText>
									</div>
								</div>
							</td>
							<td>
								<N8nSelect
									v-if="canEdit && !row.isCurrent"
									:model-value="row.role"
									:class="$style.roleSelect"
									size="small"
									:aria-label="`Project role of ${row.name}`"
									data-test-id="proto-member-role-select"
									@update:model-value="onRoleChange(row, $event)"
								>
									<N8nOption
										v-for="role in PROJECT_ROLES"
										:key="role.id"
										:value="role.id"
										:label="role.label"
										:class="$style.roleOption"
									>
										<div :class="$style.roleOptionText">
											<span :class="$style.roleOptionLabel">
												<N8nText bold color="text-dark">{{ role.label }}</N8nText>
												<N8nBadge v-if="role.custom" variant="subtle">Custom</N8nBadge>
											</span>
											<N8nText size="small" color="text-light">{{ role.description }}</N8nText>
										</div>
									</N8nOption>
								</N8nSelect>
								<span v-else :class="$style.roleText" data-test-id="proto-member-role">
									<N8nText>{{ roleLabel(row.role) }}</N8nText>
									<N8nBadge v-if="row.roleDef?.custom" variant="subtle">Custom</N8nBadge>
								</span>
							</td>
							<td v-if="canEdit" :class="$style.actionsColumn">
								<N8nTooltip v-if="!row.isCurrent" content="Remove from project" placement="top">
									<N8nIconButton
										icon="trash-2"
										variant="ghost"
										size="small"
										:aria-label="`Remove ${row.name} from the project`"
										data-test-id="proto-member-remove"
										@click="onRemove(row)"
									/>
								</N8nTooltip>
							</td>
						</tr>
						<tr v-if="filteredRows.length === 0">
							<td
								:colspan="canEdit ? 3 : 2"
								:class="$style.empty"
								data-test-id="proto-members-empty"
							>
								<N8nText size="small" color="text-light">
									No members match your search. Try a different name or email.
								</N8nText>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<N8nDialog
			:open="isAddOpen"
			size="medium"
			aria-description="Pick the people to add and the role they get in this project."
			data-test-id="proto-members-add-dialog"
			@update:open="isAddOpen = $event"
		>
			<N8nDialogHeader>
				<N8nDialogTitle>Add members</N8nDialogTitle>
			</N8nDialogHeader>
			<N8nDialogBody>
				<form id="proto-members-add-form" :class="$style.form" @submit.prevent="confirmAdd">
					<N8nInputLabel input-name="proto-members-add-people" label="People">
						<N8nSelect
							id="proto-members-add-people"
							v-model="pickedIds"
							:class="$style.fullWidth"
							multiple
							filterable
							:teleported="false"
							:disabled="candidates.length === 0"
							placeholder="Search by name"
							no-data-text="No one matches your search"
							data-test-id="proto-members-add-people"
						>
							<N8nOption
								v-for="user in candidates"
								:key="user.id"
								:value="user.id"
								:label="user.name"
							>
								<span :class="$style.personOption">
									<N8nAvatar
										:first-name="user.firstName"
										:last-name="user.lastName"
										size="xsmall"
									/>
									<N8nText color="text-dark">{{ user.name }}</N8nText>
									<N8nText size="small" color="text-light">{{ user.email }}</N8nText>
								</span>
							</N8nOption>
						</N8nSelect>
						<N8nText v-if="candidates.length === 0" size="small" color="text-light">
							Everyone on this instance is already a member.
						</N8nText>
					</N8nInputLabel>
					<N8nInputLabel input-name="proto-members-add-role" label="Project role">
						<N8nSelect
							id="proto-members-add-role"
							v-model="pickedRole"
							:class="$style.fullWidth"
							:teleported="false"
							data-test-id="proto-members-add-role"
						>
							<N8nOption
								v-for="role in PROJECT_ROLES"
								:key="role.id"
								:value="role.id"
								:label="role.label"
								:class="$style.roleOption"
							>
								<div :class="$style.roleOptionText">
									<span :class="$style.roleOptionLabel">
										<N8nText bold color="text-dark">{{ role.label }}</N8nText>
										<N8nBadge v-if="role.custom" variant="subtle">Custom</N8nBadge>
									</span>
									<N8nText size="small" color="text-light">{{ role.description }}</N8nText>
								</div>
							</N8nOption>
						</N8nSelect>
					</N8nInputLabel>
				</form>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					data-test-id="proto-members-add-cancel"
					@click="isAddOpen = false"
				>
					Cancel
				</N8nButton>
				<N8nButton
					type="submit"
					form="proto-members-add-form"
					:disabled="pickedIds.length === 0"
					data-test-id="proto-members-add-confirm"
				>
					Add members
				</N8nButton>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.search {
	flex: 0 1 var(--spacing--5xl);
	min-width: 0;
}

.count {
	margin-inline-end: auto;
	white-space: nowrap;
}

.tableWrap {
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: clip;
}

.table {
	width: 100%;
	border-collapse: collapse;
	color: var(--text-color);
	font-size: var(--font-size--sm);

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
		white-space: nowrap;
	}

	tbody tr {
		border-block-start: var(--border);
		border-block-start-color: var(--border-color--subtle);
	}
}

.roleColumn {
	width: calc(var(--spacing--4xl) * 1.75);
}

.table .actionsColumn {
	width: var(--spacing--2xl);
	padding-inline-start: 0;
	text-align: end;
}

.member {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.memberText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.nameLine {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.name,
.email {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.instanceNote {
	padding-inline-start: var(--spacing--3xs);
	border-inline-start: var(--border);
	white-space: nowrap;
}

.roleSelect,
.fullWidth {
	width: 100%;
}

.roleText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

/* Two lines an option: n8n's select reads its padding and line height from these. */
.roleOption {
	--select--option--padding: var(--spacing--2xs) var(--spacing--sm);
	--select--option--line-height: var(--line-height--md);
}

.roleOptionText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.roleOptionLabel,
.personOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.table .empty {
	padding-block: var(--spacing--lg);
	text-align: center;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
