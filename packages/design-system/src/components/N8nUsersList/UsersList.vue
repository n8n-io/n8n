<template>
	<div>
		<div
			v-for="user in sortedUsers"
			:key="user.id"
			:class="$style.itemContainer"
		>
			<n8n-user-info :user="user" :currentUserId="currentUserId" />
			<div :class="$style.badgeContainer">
				<n8n-badge v-if="user.globalRole.name === 'owner'" :bold="true">Owner</n8n-badge>
				<n8n-badge v-if="!user.firstName" :bold="true">Pending</n8n-badge>
				<n8n-action-toggle
					v-if="user.globalRole.name !== 'owner'"
					:actions="getActions(user)"
					@action="(action) => onUserAction(user, action)"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { IUser } from '../../Interface';
import Vue from 'vue';
import N8nActionToggle from '../N8nActionToggle';
import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';
import N8nUserInfo from '../N8nUserInfo';

export default Vue.extend({
	name: 'n8n-users-list',
	components: {
		N8nActionToggle,
		N8nBadge,
		N8nIcon,
		N8nText,
		N8nLink,
		N8nUserInfo,
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
			type: String,
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

				if (a.globalRole.name === 'owner') {
					return -1;
				}
				if (b.globalRole.name === 'owner') {
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
				label: 'Resend invite',
				value: 'reinvite',
			};

			if (user.globalRole.name === 'owner')	{
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

	> *:first-child {
		flex-grow: 1;
	}
}

.badgeContainer {
	display: flex;
	align-items: center;

	> * {
		margin-left: var(--spacing-2xs);
	}
}
</style>
