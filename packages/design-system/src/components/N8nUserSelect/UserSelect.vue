<template>
	<el-select
		:value="value"
		:filterable="true"
		:filterMethod="setFilter"
		:placeholder="t('nds.userSelect.selectUser')"
		:default-first-option="true"
		:popper-append-to-body="true"
		:popper-class="$style.limitPopperWidth"
		:noDataText="t('nds.userSelect.noMatchingUsers')"
		@change="onChange"
		@blur="onBlur"
		@focus="onFocus"
	>
		<el-option
			v-for="user in sortedUsers"
			:key="user.id"
			:value="user.id"
			:class="$style.itemContainer"
			:label="getLabel(user)"
		>
			<n8n-user-info v-bind="user" :isCurrentUser="currentUserId === user.id" />
		</el-option>
	</el-select>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nUserInfo from '../N8nUserInfo';
import { IUser } from '../../Interface';
import ElSelect from 'element-ui/lib/select';
import ElOption from 'element-ui/lib/option';
import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';

export default mixins(Locale).extend({
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
		value: {
			type: String,
			default: '',
		},
		ignoreIds: {
			type: Array,
			default() {
				return [];
			},
			validator: (ids: string[]) => !ids.find((id) => typeof id !== 'string'),
		},
		currentUserId: {
			type: String,
		},
	},
	data() {
		return {
			filter: '',
		};
	},
	computed: {
		fitleredUsers(): IUser[] {
			return this.users
				.filter((user: IUser) => {
					if (user.isPendingUser || !user.email) {
						return false;
					}

					if (this.ignoreIds && this.ignoreIds.includes(user.id)) {
						return false;
					}

					if (user.fullName) {
						const match = user.fullName.toLowerCase().includes(this.filter.toLowerCase());
						if (match) {
							return true;
						}
					}

					return user.email.includes(this.filter);
				});
		},
		sortedUsers(): IUser[] {
			return [...(this.fitleredUsers as IUser[])].sort((a: IUser, b: IUser) => {
				if (a.lastName && b.lastName && a.lastName !== b.lastName) {
					return a.lastName > b.lastName ? 1 : -1;
				}
				if (a.firstName && b.firstName && a.firstName !== b.firstName) {
					return a.firstName > b.firstName? 1 : -1;
				}

				return a.email > b.email ? 1 : -1;
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
			if (!user.fullName) {
				return user.email;
			}

			return `${user.fullName} (${user.email})`;
		},
	},
});
</script>


<style lang="scss" module>
.itemContainer {
	--select-option-padding: var(--spacing-2xs) var(--spacing-s);
	--select-option-line-height: 1;
}

.limitPopperWidth {
	width: 0;

	li > span {
		text-overflow: ellipsis;
		overflow-x: hidden;
	}
}
</style>
