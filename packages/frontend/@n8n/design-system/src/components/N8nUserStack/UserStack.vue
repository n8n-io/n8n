<script lang="ts" setup>
import { computed } from 'vue';

import type { IUser, UserStackGroups } from '../../types';
import N8nAvatar from '../N8nAvatar';
import { AVATAR_SIZES, type AvatarSize } from '../N8nAvatar/avatarSizes';
import N8nHoverCard from '../N8nHoverCard';
import N8nScrollArea from '../N8nScrollArea';
import N8nUserInfo from '../N8nUserInfo';

const props = withDefaults(
	defineProps<{
		users: UserStackGroups;
		currentUserEmail?: string | null;
		maxAvatars?: number;
		size?: AvatarSize;
	}>(),
	{
		currentUserEmail: '',
		maxAvatars: 2,
		size: 'small',
	},
);

// Keep the overflow badge the same diameter as the avatars.
const badgeSize = computed(() => `${AVATAR_SIZES[props.size]}px`);

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
		<N8nHoverCard :open-delay="150" :close-delay="150" :side-offset="8" show-arrow>
			<template #trigger>
				<div :class="$style.avatars" data-test-id="user-stack-avatars">
					<N8nAvatar
						v-for="user in flatUserList.slice(0, visibleAvatarCount)"
						:key="user.id"
						:first-name="user.firstName"
						:last-name="user.lastName"
						:class="$style.avatar"
						:data-test-id="`user-stack-avatar-${user.id}`"
						:size="size"
					/>
					<div
						v-if="hiddenUsersCount > 0"
						:class="$style.hiddenBadge"
						:style="{ width: badgeSize, height: badgeSize }"
					>
						+{{ hiddenUsersCount }}
					</div>
				</div>
			</template>
			<template #content>
				<N8nScrollArea type="auto" :max-height="`${menuHeight}px`">
					<div :class="$style.userList" data-test-id="user-stack-list">
						<div
							v-for="(groupUsers, groupName) in nonEmptyGroups"
							:key="groupName"
							:class="$style.groupContainer"
						>
							<span v-if="groupCount > 1" :class="$style.groupName">{{ groupName }}</span>
							<ul :class="$style.groupUsers">
								<li
									v-for="user in groupUsers"
									:key="user.id"
									:data-test-id="`user-stack-info-${user.id}`"
									:class="$style.userInfoContainer"
								>
									<N8nUserInfo
										v-bind="user"
										:is-current-user="user.email === props.currentUserEmail"
									/>
								</li>
							</ul>
						</div>
					</div>
				</N8nScrollArea>
			</template>
		</N8nHoverCard>
	</div>
</template>

<style lang="scss" module>
.avatars {
	// Shrink-wrap so the hover card anchors to the stack, not the full row.
	display: inline-flex;
}
.avatar {
	margin-right: calc(-1 * var(--spacing--3xs));
	user-select: none;
}
.hiddenBadge {
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text);
	background-color: var(--color--background--light-3);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--3xs);
	z-index: 999;
	border: var(--border-width) var(--border-style) var(--color--info--tint-1);
	border-radius: 50%;
}
.userList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
}
.groupContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.groupName {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	font-weight: var(--font-weight--bold);
}
.groupUsers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.userInfoContainer {
	display: flex;
}
</style>
