<script setup lang="ts">
import type { Role } from '@n8n/permissions';
import { N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useUsersStore } from '@/features/settings/users/users.store';

// UI-visible permission scopes (excludes auto-added :list, :execute, :listProject)
const UI_VISIBLE_SCOPES = new Set([
	// project (3)
	'project:read',
	'project:update',
	'project:delete',
	// folder (5)
	'folder:read',
	'folder:update',
	'folder:create',
	'folder:move',
	'folder:delete',
	// workflow (6)
	'workflow:read',
	'workflow:update',
	'workflow:create',
	'workflow:publish',
	'workflow:move',
	'workflow:delete',
	// credential (6)
	'credential:read',
	'credential:update',
	'credential:create',
	'credential:share',
	'credential:move',
	'credential:delete',
	// dataTable (6)
	'dataTable:read',
	'dataTable:readRow',
	'dataTable:update',
	'dataTable:writeRow',
	'dataTable:create',
	'dataTable:delete',
	// projectVariable (4)
	'projectVariable:read',
	'projectVariable:update',
	'projectVariable:create',
	'projectVariable:delete',
	// sourceControl (1)
	'sourceControl:push',
]);

const TOTAL_PROJECT_PERMISSIONS = UI_VISIBLE_SCOPES.size; // 31

const props = defineProps<{
	role: Role;
}>();

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();

const isAdminOrOwner = computed(() => usersStore.isInstanceOwner || usersStore.isAdmin);
const canEditRole = computed(() => isAdminOrOwner.value && !props.role.systemRole);

// Count only UI-visible scopes (exclude implicit :list, :execute, :listProject)
const permissionCount = computed(
	() => props.role.scopes?.filter((scope) => UI_VISIBLE_SCOPES.has(scope)).length ?? 0,
);

const buttonText = computed(() =>
	canEditRole.value
		? i18n.baseText('projects.settings.role.popover.viewAndEdit')
		: i18n.baseText('projects.settings.role.popover.viewDetails'),
);

const onButtonClick = () => {
	if (canEditRole.value) {
		// Admin + custom role → edit route
		void router.push({
			name: VIEWS.PROJECT_ROLE_SETTINGS,
			params: { roleSlug: props.role.slug },
		});
	} else {
		// Non-admin OR system role → view route
		void router.push({
			name: VIEWS.PROJECT_ROLE_VIEW,
			params: { roleSlug: props.role.slug },
		});
	}
};
</script>

<template>
	<N8nTooltip
		placement="right"
		:show-after="300"
		:enterable="true"
		:offset="1"
		content-class="role-hover-popover"
	>
		<slot />
		<template #content>
			<div :class="$style.popoverContent">
				<N8nText tag="div" :bold="true" size="medium" :class="$style.roleName">
					{{ role.displayName }}
				</N8nText>
				<N8nText tag="div" size="small" color="text-light" :class="$style.permissionCount">
					{{
						i18n.baseText('projects.settings.role.selector.permissionCount', {
							interpolate: {
								count: String(permissionCount),
								total: String(TOTAL_PROJECT_PERMISSIONS),
							},
						})
					}}
				</N8nText>
				<N8nText v-if="role.description" tag="div" size="small" :class="$style.description">
					{{ role.description }}
				</N8nText>
				<N8nButton type="tertiary" size="small" :class="$style.actionButton" @click="onButtonClick">
					{{ buttonText }}
					<template #append>
						<span :class="$style.externalIcon">↗</span>
					</template>
				</N8nButton>
			</div>
		</template>
	</N8nTooltip>
</template>

<style lang="scss" module>
.popoverContent {
	min-width: 200px;
	max-width: 280px;
}

.roleName {
	margin-bottom: var(--spacing--4xs);
}

.permissionCount {
	margin-bottom: var(--spacing--2xs);
}

.description {
	margin-bottom: var(--spacing--xs);
}

.actionButton {
	margin-top: var(--spacing--2xs);
}

.externalIcon {
	margin-left: var(--spacing--4xs);
}
</style>

<style lang="scss">
/* Global styles to override default tooltip styling for role popover */
.role-hover-popover {
	max-width: 280px !important;
	background: var(--color--background--light-2) !important;
	color: var(--color--text) !important;
	border: var(--border) !important;
	border-radius: var(--radius--sm) !important;
	box-shadow: var(--shadow) !important;

	svg {
		fill: var(--color--background--light-2) !important;
	}
}
</style>
