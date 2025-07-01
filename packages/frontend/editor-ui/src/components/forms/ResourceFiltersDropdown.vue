<script setup lang="ts">
import { computed, watch, onBeforeMount } from 'vue';
import { EnterpriseEditionFeature } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import type { BaseFilters } from '@/Interface';
import { useI18n } from '@n8n/i18n';

type IResourceFiltersType = Record<string, boolean | string | string[]>;

const props = withDefaults(
	defineProps<{
		modelValue?: IResourceFiltersType;
		keys?: string[];
		shareable?: boolean;
		reset?: () => void;
		justIcon?: boolean;
	}>(),
	{
		modelValue: () => ({}),
		keys: () => [],
		shareable: true,
		reset: () => {},
		justIcon: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: BaseFilters];
	'update:filtersLength': [value: number];
}>();

const projectsStore = useProjectsStore();

const i18n = useI18n();

const selectedProject = computed<ProjectSharingData | null>({
	get: () => {
		return (
			projectsStore.availableProjects.find(
				(project) => project.id === props.modelValue.homeProject,
			) ?? null
		);
	},
	set: (value) => setKeyValue('homeProject', value?.id ?? ''),
});

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
	} as BaseFilters;

	emit('update:modelValue', filters);
};

const resetFilters = () => {
	if (props.reset) {
		props.reset();
	} else {
		const filters = { ...props.modelValue } as BaseFilters;

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
});
</script>

<template>
	<n8n-popover trigger="click" width="304" size="large">
		<template #reference>
			<n8n-button
				icon="funnel"
				type="tertiary"
				size="small"
				:active="hasFilters"
				:class="{
					[$style['filter-button']]: true,
					[$style['no-label']]: justIcon && filtersLength === 0,
				}"
				data-test-id="resources-list-filters-trigger"
			>
				<n8n-badge
					v-if="filtersLength > 0"
					:class="$style['filter-button-count']"
					data-test-id="resources-list-filters-count"
					theme="primary"
				>
					{{ filtersLength }}
				</n8n-badge>
				<span v-if="!justIcon" :class="$style['filter-button-text']">
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
	height: 30px;
	align-items: center;

	&.no-label {
		width: 30px;
		span + span {
			margin: 0;
		}
	}

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
