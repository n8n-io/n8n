<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { DependencyType, ResolvedDependency } from '@n8n/api-types';
import { useDependencies } from '@/app/composables/useDependencies';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

const MIN_ITEMS_FOR_SEARCH = 6;

type DependencyPillSource = 'workflow_card' | 'credential_card' | 'data_table_card';
type DependencyPillResourceType = 'workflow' | 'credential' | 'dataTable';

const props = defineProps<{
	resourceType: DependencyPillResourceType;
	resourceId: string;
	totalCount?: number;
	source: DependencyPillSource;
	dataTestId?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const { getDependencies, fetchDependencies, getTotalCount } = useDependencies();

const isLoadingDetails = ref(false);

const depsResult = computed(() => getDependencies(props.resourceId));

const effectiveCount = computed(() => {
	const result = depsResult.value;
	if (result) return result.dependencies.length + result.inaccessibleCount;
	return getTotalCount(props.resourceId) ?? 0;
});

const hasHiddenDeps = computed(() => (depsResult.value?.inaccessibleCount ?? 0) > 0);

const tooltipText = computed(() =>
	i18n.baseText(`workflows.dependencies.tooltip.${props.resourceType}` as BaseTextKey),
);

const hasFullDeps = computed(() => depsResult.value !== undefined);

const showSearch = computed(
	() => (depsResult.value?.dependencies.length ?? 0) >= MIN_ITEMS_FOR_SEARCH,
);

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
	errorWorkflow: {
		icon: 'bug',
		labelKey: 'workflows.dependencies.type.errorWorkflow' as BaseTextKey,
	},
	errorWorkflowParent: {
		icon: 'bug',
		labelKey: 'workflows.dependencies.type.errorWorkflowParent' as BaseTextKey,
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
	'errorWorkflow',
	'errorWorkflowParent',
];

const menuItems = computed(() => {
	const deps = depsResult.value?.dependencies ?? [];
	if (deps.length === 0) return [];

	const query = searchTerm.value.toLowerCase().trim();
	const filtered = query ? deps.filter((dep) => dep.name.toLowerCase().includes(query)) : deps;

	const groups: Record<DependencyType, ResolvedDependency[]> = {
		credentialId: [],
		dataTableId: [],
		errorWorkflow: [],
		errorWorkflowParent: [],
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

	const dep = (depsResult.value?.dependencies ?? []).find((d) => d.type === type && d.id === id);
	if (!dep) return;

	switch (dep.type) {
		case 'credentialId':
			uiStore.openExistingCredential(dep.id);
			break;
		case 'workflowCall':
		case 'workflowParent':
		case 'errorWorkflow':
		case 'errorWorkflowParent':
			const href = router.resolve({ name: VIEWS.WORKFLOW, params: { name: dep.id } }).href;
			window.open(href, '_blank');
			break;
		case 'dataTableId':
			if (dep.projectId) {
				const href = router.resolve({
					name: DATA_TABLE_DETAILS,
					params: { projectId: dep.projectId, id: dep.id },
				}).href;
				window.open(href, '_blank');
			}
			break;
	}
}

function onSearch(term: string) {
	searchTerm.value = term;
}

async function loadDetails() {
	await fetchDependencies([props.resourceId], props.resourceType);
}

async function onDropdownToggle(open: boolean) {
	if (open) {
		telemetry.track('User opened dependency pill', {
			source: props.source,
			dependency_count: effectiveCount.value,
		});

		if (!hasFullDeps.value && !isLoadingDetails.value) {
			isLoadingDetails.value = true;
			await loadDetails();
			isLoadingDetails.value = false;
		}
	}
}
</script>

<template>
	<N8nTooltip :content="tooltipText" placement="left" :show-after="200">
		<N8nDropdownMenu
			:items="menuItems"
			trigger="hover"
			placement="bottom"
			:loading="isLoadingDetails"
			:loading-item-count="1"
			:searchable="showSearch"
			extra-popper-class="dependency-pill-dropdown"
			:search-placeholder="i18n.baseText('workflows.dependencies.search.placeholder')"
			:max-height="280"
			:data-test-id="dataTestId"
			@select="onSelect"
			@search="onSearch"
			@update:model-value="onDropdownToggle"
		>
			<template #trigger>
				<N8nBadge theme="tertiary" :class="$style.badge">
					<span :class="$style.badgeText">
						<N8nIcon icon="link" size="medium" />
						{{ effectiveCount }}
					</span>
				</N8nBadge>
			</template>
			<template v-if="hasHiddenDeps" #footer>
				<div :class="$style.hiddenNotice">
					{{
						i18n.baseText('workflows.dependencies.hiddenNotice', {
							adjustToNumber: depsResult!.inaccessibleCount,
							interpolate: { count: String(depsResult!.inaccessibleCount) },
						})
					}}
				</div>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
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

.hiddenNotice {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-top: var(--border);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--3xs);
	font-style: italic;
	line-height: var(--line-height--lg);
}
</style>

<style lang="scss">
.dependency-pill-dropdown {
	z-index: 1;
}
</style>
