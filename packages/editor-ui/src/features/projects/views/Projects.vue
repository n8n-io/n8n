<script lang="ts" setup>
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

onBeforeMount(() => {
	// TODO: redirection logic
});
</script>

<template>
	<div>Redirecting...</div>
</template>
