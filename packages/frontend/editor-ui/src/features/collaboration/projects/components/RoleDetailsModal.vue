<script lang="ts" setup>
import { computed, watch, ref } from 'vue';
import { ElDialog } from 'element-plus';
import { N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useRolesStore } from '@/app/stores/roles.store';

const props = defineProps<{
	role: Role | null;
}>();

const visible = defineModel<boolean>();
const i18n = useI18n();
const rolesStore = useRolesStore();

const isLoading = ref(false);
const roleDetails = ref<Role | null>(null);

// Scope types and definitions (matching ProjectRoleView)
const scopeTypes = [
	'project',
	'folder',
	'workflow',
	'credential',
	'dataTable',
	'projectVariable',
	'sourceControl',
] as const;

const scopes = {
	project: (['read', 'update', 'delete'] as const).map((action) => `project:${action}` as const),
	folder: (['read', 'update', 'create', 'move', 'delete'] as const).map(
		(action) => `folder:${action}` as const,
	),
	workflow: (['read', 'update', 'create', 'publish', 'move', 'delete'] as const).map(
		(action) => `workflow:${action}` as const,
	),
	credential: (['read', 'update', 'create', 'share', 'move', 'delete'] as const).map(
		(action) => `credential:${action}` as const,
	),
	sourceControl: (['push'] as const).map((action) => `sourceControl:${action}` as const),
	dataTable: (['read', 'readRow', 'update', 'writeRow', 'create', 'delete'] as const).map(
		(action) => `dataTable:${action}` as const,
	),
	projectVariable: (['read', 'update', 'create', 'delete'] as const).map(
		(action) => `projectVariable:${action}` as const,
	),
} as const;

const currentScopes = computed(() => roleDetails.value?.scopes ?? props.role?.scopes ?? []);

const hasScope = (scope: string) => currentScopes.value.includes(scope);

// Fetch role details when role changes
watch(
	() => props.role,
	async (newRole) => {
		if (newRole && visible.value) {
			isLoading.value = true;
			try {
				roleDetails.value = await rolesStore.fetchRoleBySlug({ slug: newRole.slug });
			} catch {
				// Use the passed role data if fetch fails
				roleDetails.value = newRole;
			} finally {
				isLoading.value = false;
			}
		}
	},
	{ immediate: true },
);

// Reset state when modal closes
watch(visible, (isVisible) => {
	if (!isVisible) {
		roleDetails.value = null;
	}
});

const displayRole = computed(() => roleDetails.value ?? props.role);
</script>

<template>
	<ElDialog
		v-model="visible"
		:title="i18n.baseText('projects.settings.role.details.title')"
		width="500"
	>
		<div v-if="displayRole" :class="$style.content">
			<div :class="$style.header">
				<N8nText tag="h3" size="large" :bold="true">
					{{ displayRole.displayName }}
				</N8nText>
				<N8nText v-if="displayRole.description" tag="p" size="small" color="text-light">
					{{ displayRole.description }}
				</N8nText>
			</div>

			<div :class="$style.permissionsSection">
				<N8nText tag="h4" size="medium" :bold="true" :class="$style.sectionTitle">
					{{ i18n.baseText('projects.settings.role.details.permissions') }}
				</N8nText>

				<N8nLoading v-if="isLoading" :rows="5" />

				<div v-else :class="$style.scopesContainer">
					<div v-for="type in scopeTypes" :key="type" :class="$style.scopeGroup">
						<N8nText tag="div" size="small" :bold="true" :class="$style.scopeGroupTitle">
							{{ i18n.baseText(`projectRoles.type.${type}`) }}
						</N8nText>
						<ul :class="$style.scopeList">
							<li v-for="scope in scopes[type]" :key="scope" :class="$style.scopeItem">
								<N8nIcon
									:icon="hasScope(scope) ? 'check' : 'x'"
									:color="hasScope(scope) ? 'success' : 'text-light'"
									size="small"
								/>
								<N8nText
									tag="span"
									size="small"
									:color="hasScope(scope) ? 'text-dark' : 'text-light'"
								>
									{{ i18n.baseText(`projectRoles.${scope}`) }}
								</N8nText>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</ElDialog>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing--2xs) 0;
}

.header {
	margin-bottom: var(--spacing--md);
}

.permissionsSection {
	border-top: var(--border);
	padding-top: var(--spacing--md);
}

.sectionTitle {
	margin-bottom: var(--spacing--sm);
}

.scopesContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 400px;
	overflow-y: auto;
}

.scopeGroup {
	padding-bottom: var(--spacing--xs);
	border-bottom: 1px solid var(--color--foreground--tint-1);

	&:last-child {
		border-bottom: none;
	}
}

.scopeGroupTitle {
	margin-bottom: var(--spacing--2xs);
	color: var(--color--text--tint-1);
}

.scopeList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--3xs) var(--spacing--sm);
}

.scopeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
