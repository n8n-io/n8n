<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { type Project, ProjectTypes } from '@/features/projects/projects.types';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

import { N8nLink, N8nText } from '@n8n/design-system';
import ProjectIcon from '@/features/projects/components/ProjectIcon.vue';
type Props = {
	currentProject?: Project;
	isDragging?: boolean;
	isShared?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	currentProject: undefined,
	isDragging: false,
	isShared: false,
});

const emit = defineEmits<{
	projectHover: [];
	projectDrop: [];
}>();

const i18n = useI18n();

const projectIcon = computed((): IconOrEmoji => {
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
		:class="{ [$style['home-project']]: true, [$style.dragging]: isDragging }"
		data-test-id="home-project"
		@mouseenter="onHover"
		@mouseup="isDragging ? onProjectMouseUp() : null"
	>
		<N8nLink :to="projectLink" :class="[$style['project-link']]">
			<ProjectIcon :icon="projectIcon" :border-less="true" size="mini" :title="projectName" />
			<N8nText size="medium" color="text-base" :class="$style['project-label']">
				{{ projectName }}
			</N8nText>
		</N8nLink>
	</div>
</template>

<style module lang="scss">
.home-project {
	display: flex;
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
	border: var(--border-width) var(--border-style) transparent;

	&.dragging:hover {
		border: var(--border-width) var(--border-style) var(--color--secondary);
		border-radius: var(--radius);
		background-color: var(--color-callout-secondary-background);
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

:global(.n8n-text).project-label {
	@media (max-width: $breakpoint-sm) {
		display: none;
	}
}
</style>
