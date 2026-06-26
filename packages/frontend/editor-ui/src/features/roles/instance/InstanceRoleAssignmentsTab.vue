<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { useRolesStore } from '@/app/stores/roles.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import type { RoleMember } from '@n8n/api-types';
import {
	N8nActionDropdown,
	N8nIcon,
	N8nLoading,
	N8nTableBase,
	N8nText,
	N8nUserInfo,
	N8nUserSelect,
	type ActionDropdownItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAsyncState } from '@vueuse/core';
import { ElRadio } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{ roleSlug: string }>();

const rolesStore = useRolesStore();
const usersStore = useUsersStore();
const router = useRouter();
const i18n = useI18n();
const { showError, showMessage } = useToast();

// Editing (inline change + add member) requires user:changeRole; otherwise the tab is read-only.
const canChangeRole = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'user:changeRole' } }),
);

const {
	state: members,
	isLoading,
	error,
	execute,
} = useAsyncState(async () => await rolesStore.fetchRoleMembers(props.roleSlug), {
	members: [],
	total: 0,
});

watch(
	() => props.roleSlug,
	async () => await execute(),
);

// Tracks the rows currently being updated so we can show a spinner and disable them.
const updatingUserIds = ref(new Set<string>());

// Assignable instance roles (owner already filtered out by the store) drive the dropdown,
// so custom roles appear alongside the built-in ones.
const roleOptions = computed<Array<ActionDropdownItem<string>>>(() =>
	rolesStore.processedInstanceRoles.map((role) => ({ id: role.slug, label: role.displayName })),
);

const memberUserIds = computed(() => members.value.members.map((member) => member.userId));

function roleLabel(slug: string): string {
	return rolesStore.processedInstanceRoles.find((role) => role.slug === slug)?.displayName ?? slug;
}

function isCurrentUser(member: RoleMember): boolean {
	return member.userId === usersStore.currentUserId;
}

// No self-demotion: a user cannot change their own instance role from here.
function canEditMember(member: RoleMember): boolean {
	return canChangeRole.value && !isCurrentUser(member);
}

async function changeRole(userId: string, newRoleName: string) {
	updatingUserIds.value.add(userId);
	try {
		await usersStore.updateGlobalRole({ id: userId, newRoleName });
		await execute(); // a member whose role changed away drops off this list
		await rolesStore.fetchRoles(); // refresh the member counts shown on the roles list
		showMessage({
			type: 'success',
			message: i18n.baseText('roles.instance.assignments.changeRole.success'),
		});
	} catch (e) {
		showError(e, i18n.baseText('roles.instance.assignments.changeRole.error'));
	} finally {
		updatingUserIds.value.delete(userId);
	}
}

async function onAddMember(userId: string) {
	if (!userId) return;
	await changeRole(userId, props.roleSlug);
}

function goToMembers() {
	void router.push({ name: VIEWS.USERS_SETTINGS });
}

onMounted(async () => {
	// Populate candidates for the "Add member" search (fetchUsers is a no-op without user:list).
	if (canChangeRole.value) {
		await usersStore.fetchUsers();
	}
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.toolbar">
			<N8nUserSelect
				v-if="canChangeRole"
				:class="$style.addMember"
				:model-value="''"
				:users="usersStore.allUsers"
				:current-user-id="usersStore.currentUserId ?? ''"
				:ignore-ids="memberUserIds"
				:placeholder="i18n.baseText('roles.instance.assignments.addMember')"
				data-test-id="instance-role-add-member"
				@update:model-value="onAddMember"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nUserSelect>
			<button
				:class="$style.viewAllMembers"
				type="button"
				data-test-id="instance-role-view-all-members"
				@click="goToMembers"
			>
				<N8nText color="text-dark">{{
					i18n.baseText('roles.instance.assignments.viewAllMembers')
				}}</N8nText>
				<N8nIcon icon="arrow-right" />
			</button>
		</div>

		<N8nLoading v-if="isLoading" :rows="3" />
		<div v-else-if="error" :class="$style.stateBox">
			<N8nText color="text-light">{{
				i18n.baseText('roles.instance.assignments.fetch.error')
			}}</N8nText>
		</div>
		<div v-else-if="members.members.length === 0" :class="$style.stateBox">
			<N8nText color="text-light">{{
				i18n.baseText('roles.instance.assignments.emptyState')
			}}</N8nText>
		</div>
		<N8nTableBase v-else>
			<thead>
				<tr>
					<th>{{ i18n.baseText('roles.instance.assignments.memberColumn') }}</th>
					<th>{{ i18n.baseText('roles.instance.assignments.roleColumn') }}</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="member in members.members"
					:key="member.userId"
					data-test-id="instance-role-member-row"
				>
					<td>
						<N8nUserInfo
							:first-name="member.firstName"
							:last-name="member.lastName"
							:email="member.email"
							:is-current-user="isCurrentUser(member)"
						/>
					</td>
					<td>
						<N8nActionDropdown
							v-if="canEditMember(member)"
							placement="bottom-start"
							:items="roleOptions"
							:disabled="updatingUserIds.has(member.userId)"
							data-test-id="instance-role-member-dropdown"
							@select="(slug: string) => changeRole(member.userId, slug)"
						>
							<template #activator>
								<button
									:class="$style.roleLabel"
									type="button"
									:disabled="updatingUserIds.has(member.userId)"
								>
									<N8nText color="text-dark">{{ roleLabel(member.role) }}</N8nText>
									<N8nIcon
										v-if="updatingUserIds.has(member.userId)"
										icon="spinner"
										spin
										color="text-dark"
										size="large"
									/>
									<N8nIcon v-else icon="chevron-down" color="text-dark" size="large" />
								</button>
							</template>
							<template #menuItem="item">
								<ElRadio :model-value="member.role" :label="item.id">
									<N8nText color="text-dark">{{ item.label }}</N8nText>
								</ElRadio>
							</template>
						</N8nActionDropdown>
						<N8nText v-else color="text-dark">{{ roleLabel(member.role) }}</N8nText>
					</td>
				</tr>
			</tbody>
		</N8nTableBase>
	</div>
</template>

<style lang="scss" module>
.container {
	margin-top: var(--spacing--sm);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.addMember {
	max-width: 324px;
	flex: 1;
}

.viewAllMembers {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	white-space: nowrap;
}

.stateBox {
	padding: var(--spacing--xl);
	text-align: center;
}

.roleLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: transparent;
	padding: 0;
	border: none;
	cursor: pointer;

	&:disabled {
		cursor: default;
		opacity: 0.7;
	}
}
</style>
