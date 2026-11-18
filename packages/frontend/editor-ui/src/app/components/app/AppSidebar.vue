<script setup lang="ts">
import AppNavigation from '@/app/components/appNavigation/AppNavigation.vue';
// Prototype: the app shell is a parameter. The standard one is master's sidebar.
import StandardSidebar from '@/features/projectSettingsPrototype/components/StandardSidebar.vue';
import { protoParams } from '@/features/projectSettingsPrototype/params';
</script>

<template>
	<StandardSidebar v-if="protoParams.shell === 'standard'" />
	<AppNavigation v-else />
</template>
