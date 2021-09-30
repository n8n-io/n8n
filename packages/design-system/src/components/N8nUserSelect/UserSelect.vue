<template>
	<n8n-select
		:value="value"
		:popperAppendToBody="true"
		:filterable="true"
		:filterMethod="setFilter"
		@change="onChange"
	>
		<n8n-option
			v-for="user in fitleredUsers"
			:key="user.id"
			:value="user.id"
			:class="$style.itemContainer"
			:label="getLabel(user)"
		>
			<n8n-user-info :user="user" :currentUserId="currentUserId" />
		</n8n-option>
	</n8n-select>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nUserInfo from '../N8nUserInfo';
import N8nSelect from '../N8nSelect';
import N8nOption from '../N8nOption';
import { IUser } from '../../Interface';

export default Vue.extend({
	name: 'n8n-user-select',
	components: {
		N8nSelect,
		N8nOption,
		N8nUserInfo,
	},
	props: {
		users: {
			type: Array,
			default() {
				return [];
			},
		},
		currentUserId: {
			type: String || null,
		},
		value: {
			type: String,
			default: '',
		},
		ignoreInvited: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			filter: '',
		};
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
		fitleredUsers(): IUser[] {
			return this.sortedUsers
				.filter((user: IUser) => {
					if (this.ignoreInvited && !user.firstName) {
						return false;
					}

					if (user.firstName && user.lastName) {
						const match = `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.filter.toLowerCase());
						if (match) {
							return true;
						}
					}

					return user.email.includes(this.filter);
				});
		},
	},
	methods: {
		setFilter(value: string) {
			this.filter = value;
		},
		onChange(value: string) {
			this.$emit('input', value);
		},
		getLabel(user: IUser) {
			if (!user.firstName) {
				return user.email;
			}

			return `${user.firstName} ${user.lastName} (${user.email})`;
		},
	},
});
</script>


<style lang="scss" module>
.itemContainer {
	display: flex;
	border-bottom: var(--border-base);
	padding: var(--spacing-2xs) 0 vaR(--spacing-2xs) 0;
	line-height: 1;
	padding-left: var(--spacing-s);
}
</style>
