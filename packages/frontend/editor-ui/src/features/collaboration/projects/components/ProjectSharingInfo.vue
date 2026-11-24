<script lang="ts" setup>
import { computed } from 'vue';
import type { ProjectListItem, ProjectSharingData } from '../projects.types';
import { splitName } from '../projects.utils';
import { isIconOrEmoji, N8nAvatar, type IconOrEmoji } from '@n8n/design-system';
import ProjectIcon from './ProjectIcon.vue';
import { useI18n } from '@n8n/i18n';
type Props = {
	project: ProjectListItem | ProjectSharingData;
	subtitle?: string;
};

const props = defineProps<Props>();
const i18n = useI18n();

const SERVICE_ACCOUNT_ICON: IconOrEmoji = { type: 'icon', value: 'bot' };

// The project of a service account has the account name, with no email to split.
const isServiceAccount = computed(() => props.project.accountKind === 'service');

// Two service accounts can have the same name, so name the project each acts for.
const serviceAccountLabel = computed(() => {
	const project = props.project.accountProject;
	return project
		? i18n.baseText('projects.sharing.serviceAccountIn', {
				interpolate: { project: project.name },
			})
		: i18n.baseText('projects.sharing.serviceAccount');
});

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
	if (isServiceAccount.value) return SERVICE_ACCOUNT_ICON;
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
			<div v-if="isServiceAccount" :class="$style.text">
				<p>{{ props.project.name }}</p>
				<small>{{ props.subtitle ?? serviceAccountLabel }}</small>
			</div>
			<div v-else :class="$style.text">
				<p v-if="processedName.firstName || processedName.lastName">
					{{ processedName.firstName }} {{ processedName.lastName }}
				</p>
				<small>{{ props.subtitle ?? processedName.email }}</small>
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
