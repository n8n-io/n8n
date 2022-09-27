<template>
	<div>
		<div
			v-for="(user, i) in sortedUsers"
			:key="user.id"
			class='ph-no-capture'
			:class="i === sortedUsers.length - 1 ? $style.itemContainer : $style.itemWithBorder"
		>
			<n8n-user-info v-bind="user" :isCurrentUser="currentUserId === user.id" />
			<div :class="$style.badgeContainer">
				<n8n-badge
					v-if="user.isOwner"
					theme="tertiary"
					bold
				>
					{{ t('nds.auth.roles.owner') }}
				</n8n-badge>
				<n8n-action-toggle
					v-if="!user.isOwner && !readonly && getActions(user).length > 0"
					placement="bottom"
					:actions="getActions(user)"
					theme="dark"
					@action="(action) => onUserAction(user, action)"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { IUser } from '../../types';
import N8nActionToggle from '../N8nActionToggle';
import N8nBadge from '../N8nBadge';
import N8nUserInfo from '../N8nUserInfo';
import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';
import { t } from '../../locale';

export interface IUserListAction {
	label: string;
	value: string;
}

export default mixins(Locale).extend({
	name: 'n8n-users-list',
	components: {
		N8nActionToggle,
		N8nBadge,
		N8nUserInfo,
	},
	props: {
		readonly: {
			type: Boolean,
			default: false,
		},
		users: {
			type: Array,
			required: true,
			default(): IUser[] {
				return [];
			},
		},
		currentUserId: {
			type: String,
		},
		deleteLabel: {
			type: String,
			default: () => t('nds.usersList.deleteUser'),
		},
		reinviteLabel: {
			type: String,
			default: () => t('nds.usersList.reinviteUser'),
		},
	},
	computed: {
		sortedUsers(): IUser[] {
			return [...(this.users as IUser[])].sort((a: IUser, b: IUser) => {
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
						return a.firstName > b.firstName? 1 : -1;
					}
				}

				return a.email > b.email ? 1 : -1;
			});
		},
	},
	methods: {
		getActions(user: IUser): IUserListAction[] {
			const DELETE: IUserListAction = {
				label: this.deleteLabel as string,
				value: 'delete',
			};

			const REINVITE: IUserListAction = {
				label: this.reinviteLabel as string,
				value: 'reinvite',
			};

			if (user.isOwner)	{
				return [];
			}

			if (user.firstName) {
				return [
					DELETE,
				];
			} else {
				return [
					REINVITE,
					DELETE,
				];
			}
		},
		onUserAction(user: IUser, action: string): void {
			if (action === 'delete' || action === 'reinvite') {
				this.$emit(action, user.id);
			}
		},
	},
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
