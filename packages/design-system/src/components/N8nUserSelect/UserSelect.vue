<template>
	<el-select
		:value="value"
		:filterable="true"
		:filterMethod="setFilter"
		:placeholder="placeholder"
		:default-first-option="true"
		:popper-append-to-body="true"
		noMatchText="No matches found"
		noDataText="No users"
		@change="onChange"
		@blur="onBlur"
		@focus="onFocus"
	>
		<el-option
			v-for="user in fitleredUsers"
			:key="user.id"
			:value="user.id"
			:class="$style.itemContainer"
			:label="getLabel(user)"
		>
			<n8n-user-info :user="user" :currentUserId="currentUserId" />
		</el-option>
	</el-select>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nUserInfo from '../N8nUserInfo';
import { IUser } from '../../Interface';
import ElSelect from 'element-ui/lib/select';
import ElOption from 'element-ui/lib/option';

export default Vue.extend({
	name: 'n8n-user-select',
	components: {
		N8nUserInfo,
		ElSelect,
		ElOption,
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
			default: true,
		},
		ignoreIds: {
			type: Array,
			default() {
				return [];
			},
			validator: (ids: string[]) => !ids.find((id) => typeof id !== 'string'),
		},
		placeholder: {
			type: String,
			default: 'Select user',
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

					if (this.ignoreIds && this.ignoreIds.includes(user.id)) {
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
		onBlur() {
			this.$emit('blur');
		},
		onFocus() {
			this.$emit('focus');
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
	padding: var(--spacing-2xs) var(--spacing-s) var(--spacing-2xs) var(--spacing-s) !important;
	line-height: 1 !important;
}
</style>
