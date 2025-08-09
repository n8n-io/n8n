<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { hasPermission } from '@/utils/rbac/permissions';
import { getResourcePermissions } from '@n8n/permissions';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRoute, useRouter } from 'vue-router';

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
		:style="{ borderLeftColor: sourceControlStore.preferences.branchColor }"
		data-test-id="main-sidebar-source-control"
	>
		<div
			v-if="sourceControlStore.preferences.connected && sourceControlStore.preferences.branchName"
			:class="$style.connected"
			data-test-id="main-sidebar-source-control-connected"
		>
			<span :class="$style.branchName">
				<n8n-icon icon="git-branch" />
				{{ currentBranch }}
			</span>
			<div :class="{ 'pt-xs': !isCollapsed }">
				<n8n-tooltip
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
					<n8n-button
						:class="{
							'mr-2xs': !isCollapsed,
							'mb-2xs': isCollapsed,
						}"
						:disabled="!hasPullPermission"
						data-test-id="main-sidebar-source-control-pull"
						icon="arrow-down"
						type="tertiary"
						size="mini"
						:square="isCollapsed"
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.pull')"
						@click="pullWorkfolder"
					/>
				</n8n-tooltip>
				<n8n-tooltip
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
					<n8n-button
						:square="isCollapsed"
						:label="isCollapsed ? '' : i18n.baseText('settings.sourceControl.button.push')"
						:disabled="sourceControlStore.preferences.branchReadOnly || !hasPushPermission"
						data-test-id="main-sidebar-source-control-push"
						icon="arrow-up"
						type="tertiary"
						size="mini"
						@click="pushWorkfolder"
					/>
				</n8n-tooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.sync {
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-l);
	margin: var(--spacing-2xs) 0 calc(var(--spacing-2xs) * -1);
	background: var(--color-background-light);
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	font-size: var(--font-size-2xs);

	&.isConnected {
		padding-left: var(--spacing-m);
		border-left: var(--spacing-3xs) var(--border-style-base) var(--color-foreground-base);

		&.collapsed {
			padding-left: var(--spacing-xs);
		}
	}

	&:empty {
		display: none;
	}

	button {
		font-size: var(--font-size-3xs);
	}
}

.branchName {
	white-space: normal;
	line-break: anywhere;
}

.collapsed {
	text-align: center;
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);

	.connected {
		> span {
			display: none;
		}
	}
}
</style>
