<script setup lang="ts">
import MainHeader from '@/app/components/MainHeader/MainHeader.vue';

defineProps<{
	forceFullHeader?: boolean;
}>();
</script>

<template>
	<MainHeader :force-full-header="forceFullHeader" />
</template>
