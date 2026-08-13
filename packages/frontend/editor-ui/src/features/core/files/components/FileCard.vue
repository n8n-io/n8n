<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import FileActions from '@/features/core/files/components/FileActions.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';
import DependencyPill from '@/app/components/DependencyPill.vue';

import { N8nBadge, N8nCard, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import type { FileResource } from '@/features/core/files/files.types';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useDependencies } from '@/app/composables/useDependencies';
import { getMimeFamilyIcon, getShortMimeLabel } from '@/features/core/files/utils/mimeUtils';
import { formatBytes } from '@/app/utils/typesUtils';

type Props = {
	file: FileResource;
	readOnly?: boolean;
	showOwnershipBadge?: boolean;
	selected?: boolean;
	selectable?: boolean;
};

const i18n = useI18n();
const projectsStore = useProjectsStore();
const { hasDependencies } = useDependencies();

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
	showOwnershipBadge: false,
	selected: false,
	selectable: false,
});

const emit = defineEmits<{
	preview: [file: FileResource];
	'update:selected': [selected: boolean];
}>();

const fileIcon = computed(() => getMimeFamilyIcon(props.file.mimeType));
const fileSize = computed(() => formatBytes(props.file.sizeBytes));
const fileTypeLabel = computed(() => getShortMimeLabel(props.file.mimeType));

const fileHasDependents = computed(() => hasDependencies(props.file.id));

const onCardClick = () => {
	emit('preview', props.file);
};
</script>
<template>
	<div data-test-id="file-card" @click="onCardClick">
		<N8nCard :class="$style.card">
			<template #prepend>
				<div :class="$style['card-prepend']">
					<N8nCheckbox
						v-if="props.selectable"
						:model-value="props.selected"
						:class="$style['card-checkbox']"
						data-test-id="file-card-checkbox"
						@click.stop
						@update:model-value="(value: boolean) => emit('update:selected', value)"
					/>
					<N8nIcon
						data-test-id="file-card-icon"
						:class="$style['card-icon']"
						:icon="fileIcon"
						size="xlarge"
						:stroke-width="1.5"
					/>
				</div>
			</template>
			<template #header>
				<div :class="$style['card-header']">
					<N8nText tag="h2" bold data-test-id="file-card-name">
						{{ props.file.name }}
					</N8nText>
					<N8nBadge v-if="props.readOnly" class="ml-3xs" theme="tertiary" bold>
						{{ i18n.baseText('workflows.item.readonly') }}
					</N8nBadge>
				</div>
			</template>
			<template #footer>
				<div :class="$style['card-footer']">
					<N8nText
						size="small"
						color="text-light"
						:class="[$style['info-cell'], $style['info-cell--size']]"
						data-test-id="file-card-size"
					>
						{{ fileSize }}
					</N8nText>
					<N8nText
						size="small"
						color="text-light"
						:class="[$style['info-cell'], $style['info-cell--type']]"
						data-test-id="file-card-type"
					>
						{{ fileTypeLabel }}
					</N8nText>
					<N8nText
						size="small"
						color="text-light"
						:class="[$style['info-cell'], $style['info-cell--updated']]"
						data-test-id="file-card-last-updated"
					>
						{{ i18n.baseText('workerList.item.lastUpdated') }}
						<TimeAgo :date="String(props.file.updatedAt)" />
					</N8nText>
					<N8nText
						size="small"
						color="text-light"
						:class="[$style['info-cell'], $style['info-cell--created']]"
						data-test-id="file-card-created"
					>
						{{ i18n.baseText('workflows.item.created') }}
						<TimeAgo :date="String(props.file.createdAt)" />
					</N8nText>
				</div>
			</template>
			<template #append>
				<div :class="$style['card-actions']" @click.stop>
					<DependencyPill
						v-if="fileHasDependents"
						resource-type="file"
						:resource-id="props.file.id"
						source="file_card"
						data-test-id="file-card-dependents"
					/>
					<ProjectCardBadge
						v-if="props.showOwnershipBadge"
						:class="$style['card-badge']"
						:resource="props.file"
						:resource-type="ResourceType.File"
						:resource-type-label="'File'"
						:personal-project="projectsStore.personalProject"
						:show-badge-border="false"
					/>
					<FileActions
						:file="props.file"
						:is-read-only="props.readOnly"
						location="card"
						@preview="emit('preview', props.file)"
					/>
				</div>
			</template>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.card {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.card-prepend {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.card-checkbox {
	margin-bottom: 0;
}

.card-icon {
	flex-shrink: 0;
	color: var(--color--text);
	align-content: center;
	text-align: center;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing--xs);
	margin-bottom: var(--spacing--5xs);
}

.card-footer {
	display: flex;
}

.info-cell {
	& + & {
		&::before {
			content: '|';
			margin: 0 var(--spacing--4xs);
		}
	}
}

.card-actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}

.card-badge {
	background-color: var(--color--background--light-3);
}

@include mixins.breakpoint('sm-and-down') {
	.card {
		flex-wrap: wrap;
	}
	.info-cell--created,
	.info-cell--type,
	.info-cell--size {
		display: none;
	}
}
</style>
