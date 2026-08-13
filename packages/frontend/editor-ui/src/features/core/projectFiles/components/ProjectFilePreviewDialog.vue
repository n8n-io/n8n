<script lang="ts" setup>
import type { ProjectFileResponse } from '@n8n/api-types';
import { N8nButton, N8nDialog, N8nDialogFooter } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ProjectFilePreview from '@/features/core/projectFiles/components/ProjectFilePreview.vue';

const props = defineProps<{
	open: boolean;
	projectId: string;
	file: ProjectFileResponse | null;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	download: [file: ProjectFileResponse];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nDialog
		:open="props.open"
		:header="props.file?.name"
		size="large"
		data-test-id="project-file-preview-dialog"
		@update:open="emit('update:open', $event)"
	>
		<!-- Keyed so switching rows remounts the renderer instead of showing the
			previous file's contents while the next loads. -->
		<ProjectFilePreview
			v-if="props.file"
			:key="props.file.id"
			:project-id="props.projectId"
			:file="props.file"
		/>

		<N8nDialogFooter>
			<!-- Always offered: the escape hatch when a preview fails or is truncated. -->
			<N8nButton
				v-if="props.file"
				variant="outline"
				size="small"
				data-test-id="project-file-preview-download"
				@click="emit('download', props.file)"
			>
				{{ i18n.baseText('projectFiles.action.download') }}
			</N8nButton>
			<N8nButton size="small" @click="emit('update:open', false)">
				{{ i18n.baseText('generic.close') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>
