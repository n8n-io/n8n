<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { N8nDropdownMenu } from '@n8n/design-system';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useDependencies } from '@/app/composables/useDependencies';
import { useDependencyMenu } from '@/app/composables/useDependencyMenu';

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
const telemetry = useTelemetry();
const { getDependencies, fetchDependencies, getTotalCount } = useDependencies();
const { buildDependencyMenuItems, resolveDependencyMenuId, openDependency } = useDependencyMenu();

const isLoadingDetails = ref(false);

const depsResult = computed(() => getDependencies(props.resourceId, props.resourceType));

const effectiveCount = computed(() => {
	const result = depsResult.value;
	if (result) return result.dependencies.length + result.inaccessibleCount;
	return getTotalCount(props.resourceId, props.resourceType) ?? 0;
});

const hasHiddenDeps = computed(() => (depsResult.value?.inaccessibleCount ?? 0) > 0);

const tooltipText = computed(() =>
	i18n.baseText(`workflows.dependencies.tooltip.${props.resourceType}` satisfies BaseTextKey),
);

const showSearch = computed(
	() => (depsResult.value?.dependencies.length ?? 0) >= MIN_ITEMS_FOR_SEARCH,
);

const searchTerm = ref('');

const menuItems = computed(() =>
	buildDependencyMenuItems(depsResult.value?.dependencies ?? [], searchTerm.value),
);

function onSelect(value: string) {
	const dep = resolveDependencyMenuId(depsResult.value?.dependencies ?? [], value);
	if (!dep) return;

	telemetry.track('User clicked dependency pill item', {
		source: props.source,
		dependency_type: dep.type,
		dependency_count: effectiveCount.value,
	});

	openDependency(dep);
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

		// Always refetch on open — cached entries may be stale (e.g. a credential
		// deleted since the last fetch)
		if (!isLoadingDetails.value) {
			isLoadingDetails.value = true;
			await loadDetails();
			isLoadingDetails.value = false;
		}
	}
}
</script>

<template>
	<N8nTooltip :content="tooltipText" placement="top" :show-after="300">
		<N8nDropdownMenu
			:items="menuItems"
			placement="bottom-end"
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
				<N8nBadge variant="outline" :clickable="true" leading-icon="link">
					{{ effectiveCount }}
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
.hiddenNotice {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-top: var(--border);
	color: var(--color--text--tint-1);
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
