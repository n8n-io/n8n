<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { getResourcePermissions } from '@n8n/permissions';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRoute, useRouter } from 'vue-router';

import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
defineProps<{
	isCollapsed: boolean;
}>();

const sourceControlStore = useSourceControlStore();
const projectStore = useProjectsStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const tooltipOpenDelay = ref(300);

const currentBranch = computed(() => {
	return sourceControlStore.preferences.branchName;
});

// Check if the user has permission to push for at least one project
const hasPushPermission = computed(() => {
	return (
		hasPermission(['rbac'], { rbac: { scope: 'sourceControl:push' } }) ||
		projectStore.myProjects.some(
			(project) =>
				project.type === 'team' && getResourcePermissions(project?.scopes)?.sourceControl?.push,
		)
	);
});

const hasPullPermission = computed(() => {
	return hasPermission(['rbac'], { rbac: { scope: 'sourceControl:pull' } });
});

const sourceControlAvailable = computed(
	() =>
		sourceControlStore.isEnterpriseSourceControlEnabled &&
		(hasPullPermission.value || hasPushPermission.value),
);

function getAccessibleTextColor(backgroundColor: string): string {
	const hex = backgroundColor.replace('#', '');
	const r = parseInt(hex.slice(0, 2), 16) / 255;
	const g = parseInt(hex.slice(2, 4), 16) / 255;
	const b = parseInt(hex.slice(4, 6), 16) / 255;

	const getLuminance = (channel: number) => {
		return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
	};

	const luminance = 0.2126 * getLuminance(r) + 0.7152 * getLuminance(g) + 0.0722 * getLuminance(b);

	return luminance > 0.5 ? '#000000' : '#ffffff';
}

const accessibleTextColor = computed(() => {
	return getAccessibleTextColor(sourceControlStore.preferences.branchColor);
});

async function pushWorkfolder() {
	// Navigate to route with sourceControl param - modal will handle data loading and loading states
	void router.push({
		query: {
			...route.query,
			sourceControl: 'push',
		},
	});
}

function pullWorkfolder() {
	// Navigate to route with sourceControl param - modal will handle the pull operation
	void router.push({
		query: {
			...route.query,
			sourceControl: 'pull',
		},
	});
}
</script>

<template>
	<div
		v-if="sourceControlAvailable"
		:class="{
			[$style.sync]: true,
			[$style.collapsed]: isCollapsed,
			[$style.isConnected]: sourceControlStore.isEnterpriseSourceControlEnabled,
		}"
		:style="{
			background: sourceControlStore.preferences.branchColor,
		}"
		data-test-id="main-sidebar-source-control"
	>
		<div :class="$style.connected" data-test-id="main-sidebar-source-control-connected">
			<span
				:class="$style.icon"
				:style="{
					color: accessibleTextColor,
				}"
			>
				<N8nIcon icon="git-branch" />
				<span v-if="!isCollapsed" :class="$style.branchName"> {{ currentBranch }}</span>
			</span>
			<div>
				<N8nTooltip
					:disabled="!isCollapsed && hasPullPermission"
					:show-after="tooltipOpenDelay"
					:placement="isCollapsed ? 'right' : 'top'"
				>
					<template #content>
						<div>
							{{
								!hasPullPermission
									? i18n.baseText('settings.sourceControl.button.pull.forbidden')
									: i18n.baseText('settings.sourceControl.button.pull')
							}}
						</div>
					</template>
					<N8nButton
						:style="{ color: accessibleTextColor }"
						:disabled="!hasPullPermission"
						data-test-id="main-sidebar-source-control-pull"
						icon="arrow-down"
						type="tertiary"
						size="mini"
						text
						:square="isCollapsed"
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.pull')"
						@click="pullWorkfolder"
					/>
				</N8nTooltip>
				<N8nTooltip
					:disabled="
						!isCollapsed && !sourceControlStore.preferences.branchReadOnly && hasPushPermission
					"
					:show-after="tooltipOpenDelay"
					:placement="isCollapsed ? 'right' : 'top'"
				>
					<template #content>
						<div>
							{{
								sourceControlStore.preferences.branchReadOnly || !hasPushPermission
									? i18n.baseText('settings.sourceControl.button.push.forbidden')
									: i18n.baseText('settings.sourceControl.button.push')
							}}
						</div>
					</template>
					<N8nButton
						:style="{ color: accessibleTextColor }"
						:square="isCollapsed"
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.push')"
						:disabled="sourceControlStore.preferences.branchReadOnly || !hasPushPermission"
						data-test-id="main-sidebar-source-control-push"
						icon="arrow-up"
						type="tertiary"
						text
						size="mini"
						@click="pushWorkfolder"
					/>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.sync {
	background: var(--color--background--light-2);
	font-size: var(--font-size--2xs);

	button {
		font-size: var(--font-size--2xs);
	}
}

.icon {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
}

.connected {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing--4xs);
}

.branchName {
	white-space: normal;
	line-break: anywhere;
	font-size: var(--font-size--xs);
}

.collapsed {
	text-align: center;
	flex-direction: column;
	padding-top: var(--spacing--3xs);

	.connected {
		flex-direction: column;
		gap: var(--spacing--4xs);
		padding-bottom: var(--spacing--2xs);
		padding-right: 0;

		.icon {
			width: 100%;
			justify-content: center;
		}
	}
}
</style>
