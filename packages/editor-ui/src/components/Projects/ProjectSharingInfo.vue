<script lang="ts" setup>
import { computed } from 'vue';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import { splitName } from '@/utils/projects.utils';

type Props = {
	project: ProjectListItem | ProjectSharingData;
};

const props = defineProps<Props>();

const processedName = computed(() => splitName(props.project.name ?? ''));
</script>
<template>
	<div :class="$style.projectInfo" data-test-id="project-sharing-info">
		<div>
			<N8nAvatar :first-name="processedName.firstName" :last-name="processedName.lastName" />
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
	padding: var(--spacing-2xs) 0;
	gap: 8px;
	justify-content: space-between;

	> div {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	p {
		font-size: var(--font-size-s);
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		line-height: var(--font-line-height-loose);
	}

	small {
		font-size: var(--font-size-xs);
		color: var(--color-text-light);
		line-height: var(--font-line-height-loose);
	}
}

.text {
	display: flex;
	flex-direction: column;
}
</style>
