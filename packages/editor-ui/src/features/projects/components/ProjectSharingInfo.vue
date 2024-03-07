<script lang="ts" setup>
import { computed } from 'vue';
import type { ProjectListItem, ProjectSharingData } from '@/features/projects/projects.types';

type Props = {
	project: ProjectListItem | ProjectSharingData;
};

const props = defineProps<Props>();

const splitName = computed<{
	firstName: string | null;
	lastName?: string;
	email?: string;
}>(() => {
	const regex = /^(.+)\s+<([^>]+)>$/;
	const match = props.project.name?.match(regex);

	if (match) {
		const [_, fullName, email] = match;
		const nameParts = fullName.trim().split(/\s+/);
		const lastName = nameParts.pop();
		const firstName = nameParts.join(' ');
		return { firstName, lastName, email };
	} else {
		const nameParts = props.project.name?.split(/\s+/) ?? [];
		if (nameParts.length < 2) {
			return { firstName: props.project.name };
		} else {
			const lastName = nameParts.pop();
			const firstName = nameParts.join(' ');
			return { firstName, lastName };
		}
	}
});
</script>
<template>
	<div :class="$style.projectInfo">
		<N8nAvatar :first-name="splitName.firstName" :last-name="splitName.lastName" />
		<div>
			<p>{{ splitName.firstName }} {{ splitName.lastName }}</p>
			<small>{{ splitName.email }}</small>
		</div>
	</div>
</template>

<style lang="scss" module>
.projectInfo {
	display: flex;
	align-items: center;
	width: 100%;
	padding: var(--spacing-2xs) 0;
	gap: 8px;

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
</style>
