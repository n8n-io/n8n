<script lang="ts" setup>
import { ref } from 'vue';
import type { ProjectListItem, ProjectSharingData } from '@/features/projects/projects.types';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';

type Props = {
	projects: ProjectListItem[];
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();

const selectedProject = ref<ProjectSharingData | null>(null);
</script>
<template>
	<el-dialog v-model="visible" width="500">
		<ProjectSharing v-model="selectedProject" :projects="props.projects" />
	</el-dialog>
</template>

<style lang="scss" module></style>
