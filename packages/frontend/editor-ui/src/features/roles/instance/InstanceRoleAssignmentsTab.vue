<script setup lang="ts">
import { useRolesStore } from '@/app/stores/roles.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { RoleMember } from '@n8n/api-types';
import { N8nLoading, N8nTableBase, N8nText, N8nUserInfo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAsyncState } from '@vueuse/core';
import { watch } from 'vue';

const props = defineProps<{ roleSlug: string }>();

const rolesStore = useRolesStore();
const usersStore = useUsersStore();
const i18n = useI18n();

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

function roleLabel(slug: string): string {
	return rolesStore.processedInstanceRoles.find((role) => role.slug === slug)?.displayName ?? slug;
}

function isCurrentUser(member: RoleMember): boolean {
	return member.userId === usersStore.currentUserId;
}
</script>

<template>
	<div :class="$style.container">
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
						<N8nText color="text-dark">{{ roleLabel(member.role) }}</N8nText>
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

.stateBox {
	padding: var(--spacing--xl);
	text-align: center;
}
</style>
