<template>
	<n8n-select
		:value="value"
		:filterable="true"
		:filterMethod="setFilter"
		:placeholder="placeholder"
		:default-first-option="true"
		:popper-append-to-body="true"
		:popper-class="$style.limitPopperWidth"
		:noDataText="t('nds.userSelect.noMatchingUsers')"
		:size="size"
		@change="onChange"
		@blur="onBlur"
		@focus="onFocus"
	>
		<template #prefix v-if="$slots.prefix">
			<slot name="prefix" />
		</template>
		<n8n-option
			v-for="user in sortedUsers"
			:key="user.id"
			:value="user.id"
			:class="$style.itemContainer"
			:label="getLabel(user)"
			:disabled="user.disabled"
		>
			<n8n-user-info v-bind="user" :isCurrentUser="currentUserId === user.id" />
		</n8n-option>
	</n8n-select>
</template>

<script lang="ts">
import 'vue';
import N8nUserInfo from '../N8nUserInfo';
import { IUser } from '../../types';
import ElSelect from 'element-ui/lib/select';
import ElOption from 'element-ui/lib/option';
import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';
import { t } from '../../locale';

export default mixins(Locale).extend({
	name: 'n8n-user-select',
	components: {
		N8nUserInfo,
		ElSelect, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		ElOption, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
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
		placeholder: {
			type: String,
			default: () => t('nds.userSelect.selectUser'),
		},
		size: {
			type: String,
			validator: (value: string): boolean => ['mini', 'small', 'large'].includes(value),
		},
	},
	data() {
		return {
			filter: '',
		};
	},
	computed: {
		fitleredUsers(): IUser[] {
			return (this.users as IUser[]).filter((user) => {
				if (user.isPendingUser || !user.email) {
					return false;
				}

				if (this.ignoreIds?.includes(user.id)) {
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
			return [...this.fitleredUsers].sort((a: IUser, b: IUser) => {
				if (a.lastName && b.lastName && a.lastName !== b.lastName) {
					return a.lastName > b.lastName ? 1 : -1;
				}
				if (a.firstName && b.firstName && a.firstName !== b.firstName) {
					return a.firstName > b.firstName ? 1 : -1;
				}

				if (!a.email || !b.email) {
					throw new Error('Expected all users to have email');
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

			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
