<script setup lang="ts">
import MainSidebar from '@/app/components/MainSidebar.vue';
import { useProtoChrome } from '../nav/useProtoChrome';
import ProjectSettingsNav from './ProjectSettingsNav.vue';

/**
 * The sidebar of the standard shell. A project's settings area can take it
 * over, the way instance settings do on master.
 */
const { chrome } = useProtoChrome();
</script>

<template>
	<ProjectSettingsNav v-if="chrome.sidebar === 'project-settings'" />
	<MainSidebar v-else />
</template>
