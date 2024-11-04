<script setup lang="ts">
import { ref, computed, watch, onBeforeMount } from 'vue';
import { EnterpriseEditionFeature } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import { IFilters } from '../layouts/ResourcesListLayout.vue';

type IResourceFiltersType = Record<string, boolean | string | string[]>;

const {
	modelValue = {},
	keys = [],
	shareable = true,
	reset = () => {},
} = defineProps<{
	modelValue?: IResourceFiltersType;
	keys?: string[];
	shareable?: boolean;
	reset?: () => void;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: IFilters];
	'update:filtersLength': [value: number];
}>();

const selectedProject = ref<ProjectSharingData | null>(null);
const projectsStore = useProjectsStore();

const filtersLength = computed(() => {
	let length = 0;

	keys.forEach((key) => {
		if (key === 'search') {
			return;
		}

		const value = modelValue[key];
		length += (Array.isArray(value) ? value.length > 0 : value !== '') ? 1 : 0;
	});

	return length;
});

const hasFilters = computed(() => filtersLength.value > 0);

watch(filtersLength, (value) => {
	emit('update:filtersLength', value);
});

onBeforeMount(async () => {
	await projectsStore.getAvailableProjects();
	selectedProject.value =
		projectsStore.availableProjects.find((project) => project.id === modelValue.homeProject) ??
		null;
});

const setKeyValue = (key: string, value: unknown) => {
	const filters = {
		...modelValue,
		[key]: value,
	} as IFilters;

	emit('update:modelValue', filters);
};

const resetFilters = () => {
	if (reset) {
		reset();
	} else {
		const filters = { ...modelValue } as IFilters;

		keys.forEach((key) => {
			filters[key] = Array.isArray(modelValue[key]) ? [] : '';
		});

		emit('update:modelValue', filters);
	}
	selectedProject.value = null;
};
</script>

<template>
	<n8n-popover trigger="click" width="304" size="large">
		<template #reference>
			<n8n-button
				icon="filter"
				type="tertiary"
				:active="hasFilters"
				:class="$style['filter-button']"
				data-test-id="resources-list-filters-trigger"
			>
				<n8n-badge v-show="filtersLength > 0" theme="primary" class="mr-4xs">
					{{ filtersLength }}
				</n8n-badge>
				{{ $locale.baseText('forms.resourceFiltersDropdown.filters') }}
			</n8n-button>
		</template>
		<div :class="$style['filters-dropdown']" data-test-id="resources-list-filters-dropdown">
			<slot :filters="modelValue" :set-key-value="setKeyValue" />
			<enterprise-edition
				v-if="shareable && projectsStore.isProjectHome"
				:features="[EnterpriseEditionFeature.Sharing]"
			>
				<n8n-input-label
					:label="$locale.baseText('forms.resourceFiltersDropdown.owner')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<ProjectSharing
					v-model="selectedProject"
					:projects="projectsStore.availableProjects"
					:placeholder="$locale.baseText('forms.resourceFiltersDropdown.owner.placeholder')"
					:empty-options-text="$locale.baseText('projects.sharing.noMatchingProjects')"
					@update:model-value="setKeyValue('homeProject', ($event as ProjectSharingData).id)"
				/>
			</enterprise-edition>
			<div v-if="hasFilters" :class="[$style['filters-dropdown-footer'], 'mt-s']">
				<n8n-link @click="resetFilters">
					{{ $locale.baseText('forms.resourceFiltersDropdown.reset') }}
				</n8n-link>
			</div>
		</div>
	</n8n-popover>
</template>

<style lang="scss" module>
.filter-button {
	height: 40px;
	align-items: center;
}

.filters-dropdown {
	width: 280px;
}

.filters-dropdown-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
