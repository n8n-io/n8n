<template>
	<div>
		<div
			v-for="(user, i) in sortedUsers"
			:key="user.id"
			:class="i === sortedUsers.length - 1 ? $style.itemContainer : $style.itemWithBorder"
			:data-test-id="`user-list-item-${user.email}`"
		>
			<N8nUserInfo
				v-bind="user"
				:is-current-user="currentUserId === user.id"
				:is-saml-login-enabled="isSamlLoginEnabled"
			/>
			<div :class="$style.badgeContainer">
				<N8nBadge v-if="user.isOwner" theme="tertiary" bold>
					{{ t('nds.auth.roles.owner') }}
				</N8nBadge>
				<slot v-if="!user.isOwner && !readonly" name="actions" :user="user" />
				<N8nActionToggle
					v-if="
						!user.isOwner &&
						user.signInType !== 'ldap' &&
						!readonly &&
						getActions(user).length > 0 &&
						actions.length > 0
					"
					placement="bottom"
					:actions="getActions(user)"
					theme="dark"
					@action="(action) => onUserAction(user, action)"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import N8nActionToggle from '../N8nActionToggle';
import N8nBadge from '../N8nBadge';
import N8nUserInfo from '../N8nUserInfo';
import type { IUser, UserAction } from '../../types';
import { useI18n } from '../../composables/useI18n';

interface UsersListProps {
	users: IUser[];
	readonly?: boolean;
	currentUserId?: string;
	actions?: UserAction[];
	isSamlLoginEnabled?: boolean;
}

const props = withDefaults(defineProps<UsersListProps>(), {
	readonly: false,
	currentUserId: '',
	users: () => [],
	actions: () => [],
	isSamlLoginEnabled: false,
});

const { t } = useI18n();

const sortedUsers = computed(() =>
	[...props.users].sort((a: IUser, b: IUser) => {
		if (!a.email || !b.email) {
			throw new Error('Expected all users to have email');
		}

		// invited users sorted by email
		if (a.isPendingUser && b.isPendingUser) {
			return a.email > b.email ? 1 : -1;
		}

		if (a.isPendingUser) {
			return -1;
		}
		if (b.isPendingUser) {
			return 1;
		}

		if (a.isOwner) {
			return -1;
		}
		if (b.isOwner) {
			return 1;
		}

		if (a.lastName && b.lastName && a.firstName && b.firstName) {
			if (a.lastName !== b.lastName) {
				return a.lastName > b.lastName ? 1 : -1;
			}
			if (a.firstName !== b.firstName) {
				return a.firstName > b.firstName ? 1 : -1;
			}
		}

		return a.email > b.email ? 1 : -1;
	}),
);

const defaultGuard = () => true;
const getActions = (user: IUser): UserAction[] => {
	if (user.isOwner) return [];

	return props.actions.filter((action) => (action.guard ?? defaultGuard)(user));
};

const $emit = defineEmits(['action']);
const onUserAction = (user: IUser, action: string) =>
	$emit('action', {
		action,
		userId: user.id,
	});
</script>

<style lang="scss" module>
.itemContainer {
	display: flex;
	padding: var(--spacing-2xs) 0 vaR(--spacing-2xs) 0;

	> *:first-child {
		flex-grow: 1;
	}
}

.itemWithBorder {
	composes: itemContainer;
	border-bottom: var(--border-base);
}

.badgeContainer {
	display: flex;
	align-items: center;

	> * {
		margin-left: var(--spacing-2xs);
	}
}
</style>
