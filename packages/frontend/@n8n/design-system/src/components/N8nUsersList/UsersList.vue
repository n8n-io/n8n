<script lang="ts" setup generic="UserType extends IUser = IUser">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { IUser, UserAction } from '../../types';
import N8nActionToggle from '../N8nActionToggle';
import N8nBadge from '../N8nBadge';
import N8nUserInfo from '../N8nUserInfo';

interface UsersListProps {
	users: UserType[];
	readonly?: boolean;
	currentUserId?: string | null;
	actions?: Array<UserAction<UserType>>;
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
	[...props.users].sort((a: UserType, b: UserType) => {
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
const getActions = (user: UserType): Array<UserAction<UserType>> => {
	if (user.isOwner) return [];

	return props.actions.filter((action) => (action.guard ?? defaultGuard)(user));
};

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();
const onUserAction = (user: UserType, action: string) =>
	emit('action', {
		action,
		userId: user.id,
	});
</script>

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
					@action="(action: string) => onUserAction(user, action)"
				/>
			</div>
		</div>
	</div>
</template>

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
