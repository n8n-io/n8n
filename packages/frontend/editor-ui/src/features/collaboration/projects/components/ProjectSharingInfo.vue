<script lang="ts" setup>
import { computed } from 'vue';
import type { ProjectListItem, ProjectSharingData } from '../projects.types';
import { splitName } from '../projects.utils';
import { isIconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import ProjectIcon from './ProjectIcon.vue';
import { N8nAvatar } from '@n8n/design-system';
type Props = {
	project: ProjectListItem | ProjectSharingData;
};

const props = defineProps<Props>();

const processedName = computed(() => {
	const { name, email } = splitName(props.project.name ?? '');
	const nameArray = name?.split(' ');
	const lastName = nameArray?.pop() ?? '';
	return {
		firstName: nameArray?.join(' ') ?? '',
		lastName,
		email,
	};
});

const projectIcon = computed(() => {
	if (props.project.icon && isIconOrEmoji(props.project.icon)) {
		return props.project.icon;
	}
	return null;
});
</script>
<template>
	<div :class="$style.projectInfo" data-test-id="project-sharing-info">
		<div>
			<ProjectIcon v-if="projectIcon" :icon="projectIcon" size="large" :round="true" />
			<N8nAvatar v-else :first-name="processedName.firstName" :last-name="processedName.lastName" />
			<div :class="$style.text">
				<p v-if="processedName.firstName || processedName.lastName">
					{{ processedName.firstName }} {{ processedName.lastName }}
				</p>
				<small>{{ processedName.email }}</small>
			</div>
		</div>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.projectInfo {
	display: flex;
	align-items: center;
	width: 100%;
	padding: var(--spacing--2xs) 0;
	gap: 8px;
	justify-content: space-between;

	> div {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	p {
		font-size: var(--font-size--sm);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--medium);
		line-height: var(--line-height--lg);
	}

	small {
		font-size: var(--font-size--xs);
		color: var(--color--text--tint-1);
		line-height: var(--line-height--lg);
	}
}

.text {
	display: flex;
	flex-direction: column;

	p {
		margin: 0;
	}
}
</style>
