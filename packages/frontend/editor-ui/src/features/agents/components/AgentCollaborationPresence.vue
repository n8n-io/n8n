<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/stores/users.store';
import type { UserPresence } from '../types';

interface Props {
	activeUsers: string[];
	userCount: number;
	currentUserId: string;
}

const props = defineProps<Props>();

const locale = useI18n();
const usersStore = useUsersStore();

// Filter out current user from active users
const otherUsers = computed(() => {
	return props.activeUsers.filter(userId => userId !== props.currentUserId);
});

// Get user names for other active users
const userNames = computed(() => {
	return otherUsers.value.map(userId => {
		const user = usersStore.getUserById(userId);
		return user?.firstName || user?.email || 'Anonymous';
	});
});

// Users to display (max 3 avatars)
const displayUsers = computed(() => {
	return otherUsers.value.slice(0, 3);
});

// Count of additional users not shown
const overflowCount = computed(() => {
	return Math.max(0, otherUsers.value.length - 3);
});

// Generate avatar colors based on user ID
const getUserColor = (userId: string) => {
	const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
	const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
	return colors[index];
};

// Get user initials
const getUserInitials = (userId: string) => {
	const user = usersStore.getUserById(userId);
	if (!user) return '?';

	const firstName = user.firstName || '';
	const lastName = user.lastName || '';

	if (firstName && lastName) {
		return (firstName[0] + lastName[0]).toUpperCase();
	} else if (firstName) {
		return firstName[0].toUpperCase();
	} else if (user.email) {
		return user.email[0].toUpperCase();
	}

	return '?';
};

// Format user list for tooltip
const userListText = computed(() => {
	if (userNames.value.length === 0) {
		return locale.baseText('agentCollaboration.noOtherUsers');
	}

	return locale.baseText('agentCollaboration.activeUsers', {
		interpolate: { users: userNames.value.join(', ') },
	});
});

// Show badge if there are other active users
const showBadge = computed(() => props.userCount > 1);
</script>

<template>
	<div v-if="showBadge" class="agent-collaboration-presence">
		<N8nTooltip :content="userListText" placement="bottom">
			<div class="presence-indicator">
				<div class="user-avatars">
					<div
						v-for="userId in displayUsers"
						:key="userId"
						class="user-avatar"
						:style="{ backgroundColor: getUserColor(userId) }"
					>
						{{ getUserInitials(userId) }}
					</div>
					<div v-if="overflowCount > 0" class="user-avatar more-users">
						+{{ overflowCount }}
					</div>
				</div>
				<N8nBadge
					theme="success"
					:size="small"
				>
					{{ userCount }}
				</N8nBadge>
				<N8nIcon
					icon="users"
					size="small"
					class="users-icon"
				/>
			</div>
		</N8nTooltip>
	</div>
</template>

<style scoped lang="scss">
.agent-collaboration-presence {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.presence-indicator {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs) var(--spacing-xs);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);
	border: 1px solid var(--color-border-light);
	transition: all 0.2s ease;

	&:hover {
		background-color: var(--color-background-xlight);
		border-color: var(--color-border-base);
	}
}

.user-avatars {
	display: flex;
	align-items: center;
	gap: -4px; // Overlap avatars slightly
}

.user-avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
	font-weight: 600;
	color: white;
	border: 2px solid var(--color-background-light);
	margin-left: -4px;
	transition: transform 0.2s ease;

	&:first-child {
		margin-left: 0;
	}

	&:hover {
		transform: scale(1.1);
		z-index: 10;
	}
}

.more-users {
	background-color: var(--color-foreground-base);
	font-size: 9px;
}

.users-icon {
	color: var(--color-text-light);
}
</style>