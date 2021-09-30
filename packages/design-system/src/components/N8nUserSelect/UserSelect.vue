<template>
	<n8n-select>
		<n8n-option
			v-for="user in sortedUsers"
			:key="user.id"
			:class="$style.itemContainer"
		>
			<div :class="$style.avatarContainer">
				<n8n-avatar v-if="user.firstName" :firstName="user.firstName" :lastName="user.lastName" />
				<div v-else>
					<n8n-icon icon="user-clock" size="large" />
				</div>
			</div>
			<div v-if="user.firstName" :class="$style.infoContainer">
				<div>
					<n8n-text :bold="true">{{user.firstName}} {{user.lastName}} {{currentUserId === user.id ? '(you)' : ''}}</n8n-text>
				</div>
				<div>
					<n8n-text color="light">{{user.email}}</n8n-text>
				</div>
			</div>
			<div v-else :class="$style.infoContainer">
				<n8n-text :bold="true">{{user.email}}</n8n-text>
			</div>
			<div :class="$style.badgeContainer">
				<n8n-badge v-if="user.isOwner">Owner</n8n-badge>
				<n8n-badge v-if="!user.firstName">Pending</n8n-badge>
				<n8n-action-toggle
					v-if="!user.isOwner"
					:actions="getActions(user)"
					@action="(action) => onUserAction(user, action)"
				/>
			</div>
		</n8n-option>
	</n8n-select>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nText from '../N8nText';
import N8nActionToggle from '../N8nActionToggle';

export type IRole = 'Owner' | 'Member';

export interface IUser {
	id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	isOwner: boolean;
}

export default Vue.extend({
	name: 'n8n-users-list',
	components: {
		N8nActionToggle,
		N8nAvatar,
		N8nBadge,
		'n8n-icon': N8nIcon,
		N8nText,
	},
	props: {
		users: {
			type: Array,
			required: true,
			default() {
				return [];
			},
		},
		currentUserId: {
			type: String || null,
		},
	},
	computed: {
		sortedUsers(): IUser[] {
			return [...(this.users as IUser[])].sort((a: IUser, b: IUser) => {
				// invited users sorted by email
				if (!a.lastName && !b.lastName) {
					return a.email > b.email ? 1 : -1;
				}

				// invited first
				if (!a.lastName && b.lastName) {
					return -1;
				}
				if (a.lastName && !b.lastName) {
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
		getActions(user: IUser) {
			const DELETE = {
				label: 'Delete user',
				value: 'delete',
			};

			const REINVITE = {
				label: 'Reinvite user',
				value: 'reinvite',
			};

			if (user.isOwner)	{
				return [];
			}

			if (user.firstName) {
				return [
					DELETE,
				];
			}
			else {
				return [
					REINVITE,
					DELETE,
				];
			}
		},
		onUserAction(user: IUser, action: string) {
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
	border-bottom: var(--border-base);
	padding: var(--spacing-2xs) 0 vaR(--spacing-2xs) 0;
}

.avatarContainer {
	min-height: 40px;
	min-width: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-light);
}

.infoContainer {
	flex-grow: 1;
	display: flex;
	flex-direction: column;;
	justify-content: center;
	margin-left: var(--spacing-xs);
}

.badgeContainer {
	display: flex;
	align-items: center;

	> * {
		margin-left: var(--spacing-2xs);
	}
}
</style>
