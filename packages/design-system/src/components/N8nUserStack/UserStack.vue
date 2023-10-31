<script lang="ts" setup>
import type { IUser } from '@/types';
import N8nAvatar from '../N8nAvatar';
import N8nUserInfo from '../N8nUserInfo';
import type { PropType } from 'vue';
import { computed } from 'vue';

const props = defineProps({
	users: {
		type: Object as PropType<{ [groupName: string]: IUser[] }>,
		required: true,
	},
	currentUserEmail: {
		type: String,
		required: true,
	},
	maxAvatars: {
		type: Number,
		default: 2,
	},
});

const groups = computed(() => {
	const users: { [groupName: string]: IUser[] } = {};

	for (const groupName in props.users) {
		if (props.users[groupName].length > 0) {
			users[groupName] = props.users[groupName];
		}
	}

	return users;
});

const groupCount = computed(() => {
	return Object.keys(props.users).length;
});

const flatUserList = computed(() => {
	const users: IUser[] = [];

	for (const groupName in props.users) {
		users.push(...props.users[groupName]);
	}

	return users;
});

const avatarCount = computed(() => {
	return flatUserList.value.length > props.maxAvatars + 1
		? props.maxAvatars
		: flatUserList.value.length;
});

const hiddenUsersCount = computed(() => {
	return flatUserList.value.length - avatarCount.value;
});

const menuHeight = computed(() => {
	return groupCount.value > 1 ? 220 : 180;
});
</script>

<template>
	<div class="user-stack" data-test-id="user-stack-container">
		<el-dropdown trigger="hover" :max-height="menuHeight" >
			<div :class="$style.avatars">
				<n8n-avatar
					v-for="user in flatUserList.slice(0, avatarCount)"
					:key="user.id"
					:firstName="user.firstName"
					:lastName="user.lastName"
					:class="$style.avatar"
					size="small"
				/>
				<div v-if="hiddenUsersCount > 0" :class="$style.hiddenBadge">+{{ hiddenUsersCount }}</div>
			</div>
			<template #dropdown>
				<el-dropdown-menu class="user-bunch-list">
					<el-dropdown-item v-for="(usersList, index) in groups" :key="index">
						<div v-if="usersList.length > 0" :class="$style.groupContainer">
							<header v-if="groupCount > 1" :class="$style.groupName">{{ index }}</header>
							<div :class="$style.groupUsers">
								<n8n-user-info
									v-for="user in usersList"
									:key="user.id"
									v-bind="user"
									:isCurrentUser="user.email === props.currentUserEmail"
								/>
							</div>
						</div>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<style lang="scss" module>
.avatars {
	display: flex;
	cursor: pointer;
}
.avatar {
	margin-right: calc(-1 * var(--spacing-3xs));
	user-select: none;
}
.hiddenBadge {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 28px;
	height: 28px;
	color: var(--color-text-dark);
	background-color: var(--color-background-xlight);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-3xs);
	z-index: 999;
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: 50%;
}
.groupContainer {
	display: flex;
	flex-direction: column;
}

.groupName {
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);
	text-transform: uppercase;
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-3xs);
}
.groupUsers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}
</style>

<style lang="scss">
.user-bunch-list {
	.el-dropdown-menu__item {
		line-height: var(--font-line-height-regular);
	}
	li + li {
		margin-top: var(--spacing-xs);
	}

	li:hover {
		color: currentColor !important;
	}
}
</style>
