<script lang="ts" setup>
import { computed } from 'vue';
import type { UserProject } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nDialog, N8nDialogHeader, N8nDialogTitle, N8nText } from '@n8n/design-system';
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
		<div :class="$style.list">
			<div v-for="p in projects" :key="p.id" :class="$style.row">
				<N8nText>{{ p.name }}</N8nText>
				<N8nText color="text-light" size="small">
					{{ getRoleDisplayName(p.role) }}
				</N8nText>
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

.list {
	margin-top: var(--spacing--sm);
	max-height: 400px;
	overflow-y: auto;
}

.row {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: var(--spacing--xs) 0;
}
</style>
