<script lang="ts" setup>
import { ref } from 'vue';
import type {
	Project,
	ProjectListItem,
	ProjectSharingData,
} from '@/features/projects/projects.types';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useI18n } from '@/composables/useI18n';

type Props = {
	currentProject: Project | null;
	projects: ProjectListItem[];
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();

const locale = useI18n();

const selectedProject = ref<ProjectSharingData | null>(null);
const operation = ref<'transfer' | 'delete' | null>(null);
</script>
<template>
	<el-dialog
		v-model="visible"
		:title="
			locale.baseText('projects.settings.delete.title', {
				interpolate: { projectName: props.currentProject?.name ?? '' },
			})
		"
		width="500"
	>
		<n8n-text color="text-base">{{ locale.baseText('projects.settings.delete.message') }}</n8n-text>
		<div>
			<el-radio v-model="operation" value="transfer">
				<n8n-text color="text-dark">{{
					locale.baseText('projects.settings.delete.question.transfer.label')
				}}</n8n-text>
			</el-radio>
			<div v-if="operation === 'transfer'" :class="$style.operation">
				<ProjectSharing v-model="selectedProject" :projects="props.projects" />
			</div>
		</div>
	</el-dialog>
</template>

<style lang="scss" module>
.operation {
	padding-left: var(--spacing-l);
}
</style>
