<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { IUser, SelectSize } from '../../types';
import N8nOption from '../N8nOption';
import N8nSelect from '../N8nSelect';
import N8nUserInfo from '../N8nUserInfo';

interface UserSelectProps {
	users?: IUser[];
	modelValue?: string;
	ignoreIds?: string[];
	currentUserId?: string;
	placeholder?: string;
	size?: Exclude<SelectSize, 'xlarge'>;
}

const props = withDefaults(defineProps<UserSelectProps>(), {
	users: () => [],
	modelValue: '',
	ignoreIds: () => [],
	currentUserId: '',
});

const emit = defineEmits<{
	blur: [];
	focus: [];
}>();

const { t } = useI18n();

const filter = ref('');

const filteredUsers = computed(() =>
	props.users.filter((user) => {
		if (props.ignoreIds.includes(user.id)) {
			return false;
		}

		if (user.fullName && user.email) {
			const match = user.fullName.toLowerCase().includes(filter.value.toLowerCase());
			if (match) {
				return true;
			}
		}

		return user.email?.includes(filter.value) ?? false;
	}),
);

const sortedUsers = computed(() =>
	[...filteredUsers.value].sort((a: IUser, b: IUser) => {
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
	}),
);

const setFilter = (value: string = '') => {
	filter.value = value;
};

const onBlur = () => emit('blur');
const onFocus = () => emit('focus');

const getLabel = (user: IUser) =>
	(!user.fullName ? user.email : `${user.fullName} (${user.email})`) ?? '';
</script>

<template>
	<N8nSelect
		data-test-id="user-select-trigger"
		v-bind="$attrs"
		:model-value="modelValue"
		:filterable="true"
		:filter-method="setFilter"
		:placeholder="placeholder || t('nds.userSelect.selectUser')"
		:default-first-option="true"
		teleported
		:popper-class="$style.limitPopperWidth"
		:no-data-text="t('nds.userSelect.noMatchingUsers')"
		:size="size"
		@blur="onBlur"
		@focus="onFocus"
	>
		<template v-if="$slots.prefix" #prefix>
			<slot name="prefix" />
		</template>
		<N8nOption
			v-for="user in sortedUsers"
			:id="`user-select-option-id-${user.id}`"
			:key="user.id"
			:value="user.id"
			:class="$style.itemContainer"
			:label="getLabel(user)"
			:disabled="user.disabled"
		>
			<N8nUserInfo v-bind="user" :is-current-user="currentUserId === user.id" />
		</N8nOption>
	</N8nSelect>
</template>

<style lang="scss" module>
.itemContainer {
	--select-option-padding: var(--spacing--2xs) var(--spacing--sm);
	--select-option-line-height: 1;
}

:root .limitPopperWidth {
	width: 0;

	li > span {
		text-overflow: ellipsis;
		overflow-x: hidden;
	}
}
</style>
