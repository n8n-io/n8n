<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { type Project, ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';

import { N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
type Props = {
	currentProject?: Project;
	isDragging?: boolean;
	isShared?: boolean;
	heading?: boolean;
	description?: string;
	icon?: IconOrEmoji;
};

const props = withDefaults(defineProps<Props>(), {
	currentProject: undefined,
	isDragging: false,
	isShared: false,
	heading: false,
	description: '',
	icon: undefined,
});

const emit = defineEmits<{
	projectHover: [];
	projectDrop: [];
}>();

const i18n = useI18n();

const projectIcon = computed((): IconOrEmoji => {
	if (props.icon) {
		return props.icon;
	}

	if (props.isShared) {
		return { type: 'icon', value: 'share' };
	}

	if (props.currentProject?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	}

	if (props.currentProject?.name) {
		return isIconOrEmoji(props.currentProject.icon)
			? props.currentProject.icon
			: { type: 'icon', value: 'layers' };
	}

	return { type: 'icon', value: 'house' };
});

const projectName = computed(() => {
	if (props.isShared) {
		return i18n.baseText('projects.menu.shared');
	}

	if (props.currentProject?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return props.currentProject?.name;
});

const projectLink = computed(() => {
	if (props.isShared) {
		return '/shared';
	}

	if (props.currentProject) {
		return `/projects/${props.currentProject.id}`;
	}

	return '/home';
});

const onHover = () => {
	emit('projectHover');
};

const onProjectMouseUp = () => {
	if (props.isDragging) {
		emit('projectDrop');
	}
};
</script>
<template>
	<div
		:class="{
			[$style['home-project']]: true,
			[$style.dragging]: isDragging,
			[$style.heading]: heading,
		}"
		data-test-id="home-project"
		data-droppable
		@mouseenter="onHover"
		@mouseup="isDragging ? onProjectMouseUp() : null"
	>
		<N8nTooltip :content="description" :disabled="!description" placement="top">
			<N8nLink :to="projectLink" :underline="false" :class="[$style['project-link']]">
				<ProjectIcon
					:icon="projectIcon"
					:border-less="true"
					:size="heading ? 'medium' : 'mini'"
					:title="description ? undefined : projectName"
				/>
				<N8nText
					:size="heading ? 'xlarge' : 'medium'"
					:bold="heading"
					color="text-base"
					:class="$style['project-label']"
					:title="projectName"
				>
					{{ projectName }}
				</N8nText>
			</N8nLink>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
@use '@/app/css/variables' as *;

.home-project {
	display: flex;
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
	border: var(--border-width) var(--border-style) transparent;

	&.dragging:hover {
		border: var(--border-width) var(--border-style) var(--color--secondary);
		border-radius: var(--radius);
		background-color: var(--callout--color--background--secondary);
		* {
			cursor: grabbing;
			color: var(--color--text);
		}
	}

	&:hover :global(.n8n-text) {
		color: var(--color--text--shade-1);
	}
}

.project-link :global(.n8n-text) {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.heading .project-link :global(.n8n-text) {
	gap: var(--spacing--xs);
}

:global(.n8n-text).project-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 200px;

	@media (max-width: $breakpoint-sm) {
		display: none;
	}
}
</style>
