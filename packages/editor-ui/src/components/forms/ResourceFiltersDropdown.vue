<script setup lang="ts">
import { ref, computed, watch, onBeforeMount } from 'vue';
import { EnterpriseEditionFeature } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import type { IFilters } from '../layouts/ResourcesListLayout.vue';
import { useI18n } from '@/composables/useI18n';

type IResourceFiltersType = Record<string, boolean | string | string[]>;

const props = withDefaults(
	defineProps<{
		modelValue?: IResourceFiltersType;
		keys?: string[];
		shareable?: boolean;
		reset?: () => void;
	}>(),
	{
		modelValue: () => ({}),
		keys: () => [],
		shareable: true,
		reset: () => {},
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: IFilters];
	'update:filtersLength': [value: number];
}>();

const selectedProject = ref<ProjectSharingData | null>(null);

const projectsStore = useProjectsStore();

const i18n = useI18n();

const filtersLength = computed(() => {
	let length = 0;

	props.keys.forEach((key) => {
		if (key === 'search') {
			return;
		}

		const value = props.modelValue[key];

		if (value === true) {
			length += 1;
		}

		if (Array.isArray(value) && value.length) {
			length += 1;
		}

		if (typeof value === 'string' && value !== '') {
			length += 1;
		}
	});

	return length;
});

const hasFilters = computed(() => filtersLength.value > 0);

const setKeyValue = (key: string, value: unknown) => {
	const filters = {
		...props.modelValue,
		[key]: value,
	} as IFilters;

	emit('update:modelValue', filters);
};

const resetFilters = () => {
	if (props.reset) {
		props.reset();
	} else {
		const filters = { ...props.modelValue } as IFilters;

		props.keys.forEach((key) => {
			filters[key] = Array.isArray(props.modelValue[key]) ? [] : '';
		});

		emit('update:modelValue', filters);
	}
	selectedProject.value = null;
};

watch(filtersLength, (value) => {
	emit('update:filtersLength', value);
});

onBeforeMount(async () => {
	await projectsStore.getAvailableProjects();
	selectedProject.value =
		projectsStore.availableProjects.find(
			(project) => project.id === props.modelValue.homeProject,
		) ?? null;
});
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
				<n8n-badge
					v-show="filtersLength > 0"
					:class="$style['filter-button-count']"
					theme="primary"
				>
					{{ filtersLength }}
				</n8n-badge>
				<span :class="$style['filter-button-text']">
					{{ i18n.baseText('forms.resourceFiltersDropdown.filters') }}
				</span>
			</n8n-button>
		</template>
		<div :class="$style['filters-dropdown']" data-test-id="resources-list-filters-dropdown">
			<slot :filters="modelValue" :set-key-value="setKeyValue" />
			<enterprise-edition
				v-if="shareable && projectsStore.isProjectHome"
				:features="[EnterpriseEditionFeature.Sharing]"
			>
				<n8n-input-label
					:label="i18n.baseText('forms.resourceFiltersDropdown.owner')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<ProjectSharing
					v-model="selectedProject"
					:projects="projectsStore.availableProjects"
					:placeholder="i18n.baseText('forms.resourceFiltersDropdown.owner.placeholder')"
					:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
					@update:model-value="setKeyValue('homeProject', ($event as ProjectSharingData).id)"
				/>
			</enterprise-edition>
			<div v-if="hasFilters" :class="[$style['filters-dropdown-footer'], 'mt-s']">
				<n8n-link @click="resetFilters">
					{{ i18n.baseText('forms.resourceFiltersDropdown.reset') }}
				</n8n-link>
			</div>
		</div>
	</n8n-popover>
</template>

<style lang="scss" module>
.filter-button {
	height: 40px;
	align-items: center;

	.filter-button-count {
		margin-right: var(--spacing-4xs);

		@include mixins.breakpoint('xs-only') {
			margin-right: 0;
		}
	}

	@media screen and (max-width: 480px) {
		.filter-button-text {
			text-indent: -10000px;
		}

		// Remove icon margin when the "Filters" text is hidden
		:global(span + span) {
			margin: 0;
		}
	}
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
