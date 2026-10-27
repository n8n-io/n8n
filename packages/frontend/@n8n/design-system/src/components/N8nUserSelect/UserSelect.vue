<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { IUser, SelectSize } from '../../types';
import N8nAvatar from '../N8nAvatar';
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
	remote?: boolean;
	remoteMethod?: (query: string) => void;
	loading?: boolean;
	/** Set to false to keep the dropdown in the local stacking context, e.g. inside N8nDialog */
	teleported?: boolean;
	/** Show only the name of the selected user. The options still show the email. */
	hideEmailInLabel?: boolean;
	/** Show the avatar of the selected user before the name. */
	showAvatar?: boolean;
	/** Show the border only on hover and focus, for a picker inside a table row or a list. */
	borderless?: boolean;
}

const props = withDefaults(defineProps<UserSelectProps>(), {
	users: () => [],
	modelValue: '',
	ignoreIds: () => [],
	currentUserId: '',
	remote: false,
	loading: false,
	teleported: true,
	hideEmailInLabel: false,
	showAvatar: false,
	borderless: false,
});

const emit = defineEmits<{
	blur: [];
	focus: [];
}>();

const { t } = useI18n();

const filter = ref('');

const filteredUsers = computed(() => {
	// In remote mode, don't do client-side filtering - use the users as-is
	if (props.remote) {
		return props.users.filter((user) => !props.ignoreIds.includes(user.id));
	}

	// Local filtering mode (existing behavior)
	return props.users.filter((user) => {
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
	});
});

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
	// In remote mode, delegate to the parent's remote method
	if (props.remote && props.remoteMethod) {
		props.remoteMethod(value);
	}
};

const onBlur = () => emit('blur');
const onFocus = () => emit('focus');

const selectedUser = computed(() => props.users.find((user) => user.id === props.modelValue));

// A user can have only a full name. The avatar then takes its initials from it.
const avatarNames = computed(() => {
	const user = selectedUser.value;
	if (!user) return {};
	if (user.firstName || user.lastName) {
		return { firstName: user.firstName, lastName: user.lastName };
	}
	return { firstName: user.fullName };
});

const getLabel = (user: IUser) => {
	if (!user.fullName) return user.email ?? '';
	return props.hideEmailInLabel ? user.fullName : `${user.fullName} (${user.email})`;
};
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
		:teleported="teleported"
		:popper-class="$style.limitPopperWidth"
		:no-data-text="t('nds.userSelect.noMatchingUsers')"
		:size="size"
		:remote="remote"
		:loading="loading"
		:class="{ [$style.withAvatar]: showAvatar, [$style.borderless]: borderless }"
		@blur="onBlur"
		@focus="onFocus"
	>
		<template v-if="showAvatar || $slots.prefix" #prefix>
			<N8nAvatar
				v-if="showAvatar"
				size="xsmall"
				:first-name="avatarNames.firstName"
				:last-name="avatarNames.lastName"
				data-test-id="user-select-avatar"
			/>
			<slot v-else name="prefix" />
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
	--select--option--padding: var(--spacing--2xs) var(--spacing--sm);
	--select--option--line-height: 1;
}

/* The select reserves room for an icon. The avatar is wider, so the text starts after it. */
.withAvatar :global(.el-select .el-input--prefix .el-input__inner) {
	padding-left: calc(var(--spacing--2xs) * 2 + var(--spacing--md));
}

.borderless:not(:hover, :focus-within) :global(.el-input__inner) {
	border-color: transparent;
	background-color: transparent;
}

:root .limitPopperWidth {
	width: 0;

	li > span {
		text-overflow: ellipsis;
		overflow-x: hidden;
	}
}
</style>
