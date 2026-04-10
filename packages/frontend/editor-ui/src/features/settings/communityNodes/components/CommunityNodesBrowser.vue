<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { N8nInput, N8nRadioButtons, N8nActionBox, N8nSelect, N8nOption } from '@n8n/design-system';
import CommunityPackageBrowseCard from './CommunityPackageBrowseCard.vue';
import { computed, ref } from 'vue';

type FilterValue = 'all' | 'official' | 'community';
type SortValue = 'popular' | 'name' | 'recent';

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const search = ref('');
const filter = ref<FilterValue>('all');
const sort = ref<SortValue>('popular');

const filterOptions = computed(() => [
	{ label: i18n.baseText('settings.communityNodes.browse.filter.all'), value: 'all' as const },
	{
		label: i18n.baseText('settings.communityNodes.browse.filter.official'),
		value: 'official' as const,
	},
	{
		label: i18n.baseText('settings.communityNodes.browse.filter.community'),
		value: 'community' as const,
	},
]);

const sortOptions = computed(() => [
	{
		label: i18n.baseText('settings.communityNodes.browse.sort.popular'),
		value: 'popular' as const,
	},
	{ label: i18n.baseText('settings.communityNodes.browse.sort.name'), value: 'name' as const },
	{ label: i18n.baseText('settings.communityNodes.browse.sort.recent'), value: 'recent' as const },
]);

const filteredPackages = computed(() => {
	let packages = nodeTypesStore.vettedCommunityPackages;

	if (filter.value === 'official') {
		packages = packages.filter((pkg) => pkg.isOfficialNode);
	} else if (filter.value === 'community') {
		packages = packages.filter((pkg) => !pkg.isOfficialNode);
	}

	if (search.value.trim()) {
		const query = search.value.toLowerCase().trim();
		packages = packages.filter(
			(pkg) =>
				pkg.packageName.toLowerCase().includes(query) ||
				pkg.authorName.toLowerCase().includes(query) ||
				pkg.description.toLowerCase().includes(query) ||
				pkg.nodes.some((node) => (node.displayName ?? node.name).toLowerCase().includes(query)),
		);
	}

	const sorted = [...packages];
	switch (sort.value) {
		case 'popular':
			sorted.sort((a, b) => b.numberOfDownloads - a.numberOfDownloads);
			break;
		case 'name':
			sorted.sort((a, b) => a.packageName.localeCompare(b.packageName));
			break;
		case 'recent':
			sorted.sort((a, b) => {
				const dateA = a.nodes[0]?.createdAt ?? '';
				const dateB = b.nodes[0]?.createdAt ?? '';
				return dateB.localeCompare(dateA);
			});
			break;
	}

	return sorted;
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.controls">
			<N8nInput
				v-model="search"
				:placeholder="i18n.baseText('settings.communityNodes.browse.search.placeholder')"
				:class="$style.searchInput"
				data-test-id="community-nodes-search"
			>
				<template #prefix>
					<font-awesome-icon icon="search" />
				</template>
			</N8nInput>
			<N8nRadioButtons
				v-model="filter"
				:options="filterOptions"
				size="small"
				data-test-id="community-nodes-filter"
			/>
			<N8nSelect
				v-model="sort"
				:class="$style.sortSelect"
				size="small"
				data-test-id="community-nodes-sort"
			>
				<N8nOption
					v-for="opt in sortOptions"
					:key="opt.value"
					:label="opt.label"
					:value="opt.value"
				/>
			</N8nSelect>
		</div>
		<div v-if="filteredPackages.length === 0" :class="$style.emptyState">
			<N8nActionBox
				:heading="i18n.baseText('settings.communityNodes.browse.empty.title')"
				:description="i18n.baseText('settings.communityNodes.browse.empty.description')"
			/>
		</div>
		<div v-else :class="$style.grid">
			<CommunityPackageBrowseCard
				v-for="pkg in filteredPackages"
				:key="pkg.packageName"
				:pkg="pkg"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.searchInput {
	flex: 1;
	max-width: 320px;
}

.sortSelect {
	width: 160px;
	margin-left: auto;
}

.emptyState {
	text-align: center;
	padding: var(--spacing--2xl) 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	gap: var(--spacing--xs);
}
</style>
