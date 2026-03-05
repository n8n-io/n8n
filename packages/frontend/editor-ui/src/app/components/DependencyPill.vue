<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

interface ResolvedDependency {
	type: string;
	id: string;
	name: string;
	projectId?: string;
}

type DependencyType = 'credentialId' | 'dataTableId' | 'workflowCall' | 'workflowParent';

const props = defineProps<{
	dependencies: ResolvedDependency[];
	dataTestId?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();

const searchTerm = ref('');

const typeConfig: Record<DependencyType, { icon: IconName; labelKey: BaseTextKey }> = {
	credentialId: {
		icon: 'key-round',
		labelKey: 'workflows.dependencies.type.credentials' as BaseTextKey,
	},
	dataTableId: {
		icon: 'table',
		labelKey: 'workflows.dependencies.type.dataTables' as BaseTextKey,
	},
	workflowCall: {
		icon: 'log-in',
		labelKey: 'workflows.dependencies.type.subWorkflows' as BaseTextKey,
	},
	workflowParent: {
		icon: 'log-in',
		labelKey: 'workflows.dependencies.type.parentWorkflows' as BaseTextKey,
	},
};

const displayOrder: DependencyType[] = [
	'credentialId',
	'dataTableId',
	'workflowCall',
	'workflowParent',
];

const menuItems = computed(() => {
	const query = searchTerm.value.toLowerCase().trim();
	const filtered = query
		? props.dependencies.filter((dep) => dep.name.toLowerCase().includes(query))
		: props.dependencies;

	const groups: Record<DependencyType, ResolvedDependency[]> = {
		credentialId: [],
		dataTableId: [],
		workflowCall: [],
		workflowParent: [],
	};
	for (const dep of filtered) {
		const key = dep.type as DependencyType;
		if (groups[key]) {
			groups[key].push(dep);
		}
	}

	const items: Array<DropdownMenuItemProps<string>> = [];
	for (const typeKey of displayOrder) {
		const deps = groups[typeKey];
		if (deps.length === 0) continue;

		const config = typeConfig[typeKey];
		// Add a disabled "header" item as group label, with divider if not the first group
		items.push({
			id: `header-${typeKey}`,
			label: i18n.baseText(config.labelKey),
			icon: { type: 'icon', value: config.icon },
			disabled: true,
			divided: items.length > 0,
		});

		for (const dep of deps) {
			items.push({
				id: `${dep.type}:${dep.id}`,
				label: dep.name,
			});
		}
	}

	return items;
});

function onSelect(value: string) {
	const [type, id] = value.split(':') as [string, string];
	if (!type || !id) return;

	const dep = props.dependencies.find((d) => d.type === type && d.id === id);
	if (!dep) return;

	if (dep.type === 'credentialId') {
		uiStore.openExistingCredential(dep.id);
	} else if (dep.type === 'workflowCall' || dep.type === 'workflowParent') {
		const href = router.resolve({ name: VIEWS.WORKFLOW, params: { name: dep.id } }).href;
		window.open(href, '_blank');
	} else if (dep.type === 'dataTableId' && dep.projectId) {
		const href = router.resolve({
			name: DATA_TABLE_DETAILS,
			params: { projectId: dep.projectId, id: dep.id },
		}).href;
		window.open(href, '_blank');
	}
}

function onSearch(term: string) {
	searchTerm.value = term;
}
</script>

<template>
	<N8nDropdownMenu
		:items="menuItems"
		trigger="hover"
		placement="bottom"
		searchable
		extra-popper-class="dependency-pill-dropdown"
		:search-placeholder="i18n.baseText('workflows.dependencies.search.placeholder' as BaseTextKey)"
		:empty-text="i18n.baseText('workflows.dependencies.search.empty' as BaseTextKey)"
		:max-height="280"
		:data-test-id="dataTestId"
		@select="onSelect"
		@search="onSearch"
	>
		<template #trigger>
			<N8nBadge theme="tertiary" :class="$style.badge">
				<span :class="$style.badgeText">
					<N8nIcon icon="link" size="medium" />
					{{ dependencies.length }}
				</span>
			</N8nBadge>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.badge {
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	border-color: var(--color--foreground);
	color: var(--color--text);
}

.badgeText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	line-height: calc(var(--font-size--sm) + 1px);
}
</style>

<style lang="scss">
.dependency-pill-dropdown {
	z-index: 1;
}
</style>
