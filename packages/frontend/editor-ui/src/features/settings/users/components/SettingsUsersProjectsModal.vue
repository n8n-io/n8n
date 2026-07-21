<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { UserProject } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import {
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
	N8nInput,
	N8nIcon,
} from '@n8n/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useRolesStore } from '@/app/stores/roles.store';

const props = defineProps<{
	open: boolean;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	projects: UserProject[];
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const projectNameFilter = ref('');

const i18n = useI18n();
const rolesStore = useRolesStore();

const roleDisplayNameMap = computed(
	() => new Map(rolesStore.roles.project.map((role) => [role.slug, role.displayName])),
);

function getRoleDisplayName(slug: string): string {
	return roleDisplayNameMap.value.get(slug) ?? slug;
}

const userName = computed(
	() => [props.firstName, props.lastName].filter(Boolean).join(' ').trim() || props.email || '',
);

const projectsToShow = computed(() => {
	const query = projectNameFilter.value.trim().toLowerCase();
	if (!query) return props.projects;

	return props.projects.filter((project) => project.name.toLowerCase().includes(query));
});
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="emit('update:open', $event)">
		<N8nDialogHeader :class="$style.header">
			<N8nDialogTitle>
				{{
					i18n.baseText('settings.users.projectsModal.title', { interpolate: { user: userName } })
				}}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nInput
			v-model="projectNameFilter"
			:class="$style.search"
			:placeholder="i18n.baseText('settings.users.projectsModal.searchPlaceholder')"
			clearable
			data-test-id="user-projects-modal-search"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>
		<div :class="$style.list">
			<N8nText
				v-if="projectsToShow.length === 0"
				:class="$style.empty"
				color="text-light"
				size="small"
			>
				{{ i18n.baseText('settings.users.projectsModal.noResults') }}
			</N8nText>
			<div v-for="p in projectsToShow" :key="p.id" :class="$style.row">
				<ProjectIcon :icon="p.icon ?? DEFAULT_PROJECT_ICON" size="medium" round />
				<div :class="$style.info">
					<N8nText>{{ p.name }}</N8nText>
					<N8nText color="text-light" size="small">
						{{ getRoleDisplayName(p.role) }}
					</N8nText>
				</div>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
// Bleed the header to the card edges (cancel the dialog's --spacing--lg content
// padding), then re-inset the text so the bottom border spans edge to edge.
.header {
	margin: calc(var(--spacing--lg) * -1) calc(var(--spacing--lg) * -1) 0;
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--sm);
	border-bottom: var(--border);

	& .title {
		font-size: var(--font-size--xl);
	}
}

.search {
	margin-top: var(--spacing--xs);
}

.list {
	margin-top: var(--spacing--sm);
	max-height: 400px;
	overflow-y: auto;
}

.empty {
	display: block;
	padding: var(--spacing--sm) 0;
	text-align: center;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) 0;
}

.info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	min-width: 0;
}
</style>
