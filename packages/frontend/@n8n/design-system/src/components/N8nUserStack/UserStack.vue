<script lang="ts" setup>
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { computed } from 'vue';

import type { IUser, UserStackGroups } from '../../types';
import N8nAvatar from '../N8nAvatar';
import N8nUserInfo from '../N8nUserInfo';

const props = withDefaults(
	defineProps<{
		users: UserStackGroups;
		currentUserEmail?: string | null;
		maxAvatars?: number;
		dropdownTrigger?: 'hover' | 'click';
	}>(),
	{
		currentUserEmail: '',
		maxAvatars: 2,
		dropdownTrigger: 'hover',
	},
);

const nonEmptyGroups = computed(() => {
	const users: UserStackGroups = {};

	for (const groupName in props.users) {
		if (props.users[groupName].length > 0) {
			users[groupName] = props.users[groupName];
		}
	}

	return users;
});

const groupCount = computed(() => {
	return Object.keys(nonEmptyGroups.value).length;
});

const flatUserList = computed(() => {
	const users: IUser[] = [];

	for (const groupName in props.users) {
		users.push(...props.users[groupName]);
	}

	return users;
});

const visibleAvatarCount = computed(() => {
	return flatUserList.value.length >= props.maxAvatars
		? props.maxAvatars
		: flatUserList.value.length;
});

const hiddenUsersCount = computed(() => {
	return flatUserList.value.length - visibleAvatarCount.value;
});

const menuHeight = computed(() => {
	return groupCount.value > 1 ? 220 : 190;
});
</script>

<template>
	<div class="user-stack" data-test-id="user-stack-container">
		<ElDropdown
			:trigger="$props.dropdownTrigger"
			:max-height="menuHeight"
			popper-class="user-stack-popper"
		>
			<div :class="$style.avatars" data-test-id="user-stack-avatars">
				<N8nAvatar
					v-for="user in flatUserList.slice(0, visibleAvatarCount)"
					:key="user.id"
					:first-name="user.firstName"
					:last-name="user.lastName"
					:class="$style.avatar"
					:data-test-id="`user-stack-avatar-${user.id}`"
					size="small"
				/>
				<div v-if="hiddenUsersCount > 0" :class="$style.hiddenBadge">+{{ hiddenUsersCount }}</div>
			</div>
			<template #dropdown>
				<ElDropdownMenu class="user-stack-list" data-test-id="user-stack-list">
					<div v-for="(groupUsers, index) in nonEmptyGroups" :key="index">
						<div :class="$style.groupContainer">
							<ElDropdownItem>
								<header v-if="groupCount > 1" :class="$style.groupName">{{ index }}</header>
							</ElDropdownItem>
							<div :class="$style.groupUsers">
								<ElDropdownItem
									v-for="user in groupUsers"
									:key="user.id"
									:data-test-id="`user-stack-info-${user.id}`"
									:class="$style.userInfoContainer"
								>
									<N8nUserInfo
										v-bind="user"
										:is-current-user="user.email === props.currentUserEmail"
									/>
								</ElDropdownItem>
							</div>
						</div>
					</div>
				</ElDropdownMenu>
			</template>
		</ElDropdown>
	</div>
</template>

<style lang="scss" module>
.avatars {
	display: flex;
	cursor: pointer;
}
.avatar {
	margin-right: calc(-1 * var(--spacing--3xs));
	user-select: none;
}
.hiddenBadge {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 28px;
	height: 28px;
	color: var(--color--text);
	background-color: var(--color--background--light-3);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--3xs);
	z-index: 999;
	border: var(--border-width) var(--border-style) var(--color-info-tint-1);
	border-radius: 50%;
}
.groupContainer {
	display: flex;
	flex-direction: column;

	& + & {
		margin-top: var(--spacing--3xs);
	}
}

.groupName {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--4xs);
}
.groupUsers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.userInfoContainer {
	display: flex;
	padding-top: var(--spacing--5xs);
	padding-bottom: var(--spacing--5xs);
}
</style>

<style lang="scss">
ul.user-stack-list {
	border: none;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-bottom: var(--spacing--2xs);

	.el-dropdown-menu__item {
		line-height: var(--line-height--md);
	}

	li:hover {
		color: currentColor !important;
	}
}

.user-stack-popper {
	border: 1px solid var(--border-color--light);
	border-radius: var(--radius);
	padding: var(--spacing--5xs) 0;
	box-shadow: 0 2px 8px 0 #441c171a;
	background-color: var(--color--background--light-3);
}
</style>
