<script setup lang="ts">
import { useCollaborationStore, useUsersStore } from '@/stores';
import { computed } from 'vue';

const collaborationStore = useCollaborationStore();
const usersStore = useUsersStore();

const activeUsers = computed(() => {
	return {
		default: (collaborationStore.getUsersForCurrentWorkflow || []).map((userInfo) => userInfo.user),
	};
});

const currentUserEmail = computed(() => {
	return usersStore.currentUser?.email;
});
</script>

<template>
	<div :class="`collaboration-pane-container ${$style.container}`">
		<n8n-user-stack
			v-if="activeUsers.default.length > 1"
			:users="activeUsers"
			:currentUserEmail="currentUserEmail"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	margin: 0 var(--spacing-4xs);
}
</style>
