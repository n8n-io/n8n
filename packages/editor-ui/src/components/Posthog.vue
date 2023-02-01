<script lang="ts" setup>
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { watch, getCurrentInstance, onMounted } from 'vue';

const usersStore = useUsersStore();
const rootStore = useRootStore();
const instance = getCurrentInstance();

onMounted(() => {
	instance?.proxy?.$posthog.identify(
		rootStore.instanceId,
		usersStore.currentUser,
		rootStore.versionCli,
	);
});

watch(
	() => usersStore.currentUserId,
	() => {
		instance?.proxy?.$posthog.identify(
			rootStore.instanceId,
			usersStore.currentUser,
			rootStore.versionCli,
		);
	},
);
</script>

<template>
	<fragment></fragment>
</template>
