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
					class="pt-2xs"
					:projects="projectsStore.projects"
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

<script lang="ts">
import { defineComponent } from 'vue';
import { EnterpriseEditionFeature } from '@/constants';
import { mapStores } from 'pinia';
import { useProjectsStore } from '@/stores/projects.store';
import type { PropType } from 'vue';
import type { ProjectSharingData } from '@/types/projects.types';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';

export type IResourceFiltersType = Record<string, boolean | string | string[]>;

export default defineComponent({
	components: {
		ProjectSharing,
	},
	props: {
		modelValue: {
			type: Object as PropType<IResourceFiltersType>,
			default: () => ({}),
		},
		keys: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		shareable: {
			type: Boolean,
			default: true,
		},
		reset: {
			type: Function as PropType<() => void>,
			default: () => {},
		},
	},
	data() {
		return {
			EnterpriseEditionFeature,
			selectedProject: null as ProjectSharingData | null,
		};
	},
	computed: {
		...mapStores(useProjectsStore),
		filtersLength(): number {
			let length = 0;

			this.keys.forEach((key) => {
				if (key === 'search') {
					return;
				}

				const value = this.modelValue[key];
				length += (Array.isArray(value) ? value.length > 0 : value !== '') ? 1 : 0;
			});

			return length;
		},
		hasFilters(): boolean {
			return this.filtersLength > 0;
		},
	},
	watch: {
		filtersLength(value: number) {
			this.$emit('update:filtersLength', value);
		},
	},
	async beforeMount() {
		await this.projectsStore.getAllProjects();
		this.selectedProject =
			this.projectsStore.projects.find((project) => project.id === this.modelValue.homeProject) ??
			null;
	},
	methods: {
		setKeyValue(key: string, value: unknown) {
			const filters = {
				...this.modelValue,
				[key]: value,
			};

			this.$emit('update:modelValue', filters);
		},
		resetFilters() {
			if (this.reset) {
				this.reset();
			} else {
				const filters = { ...this.modelValue };

				this.keys.forEach((key) => {
					filters[key] = Array.isArray(this.modelValue[key]) ? [] : '';
				});

				this.$emit('update:modelValue', filters);
			}
			this.selectedProject = null;
		},
	},
});
</script>

<style lang="scss" module>
.filter-button {
	height: 40px;
	align-items: center;
}

.filters-dropdown {
	width: 280px;
	padding-bottom: var(--spacing-s);
}

.filters-dropdown-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
