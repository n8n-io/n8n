<template>
	<n8n-popover
		trigger="click"
	>
		<template slot="reference">
			<n8n-button
				icon="filter"
				type="tertiary"
				size="medium"
				:active="hasFilters"
				:class="[$style['filter-button'], 'ml-2xs']"
			>
				<n8n-badge
					v-show="filtersLength > 0"
					theme="primary"
					class="mr-4xs"
				>
					{{ filtersLength }}
				</n8n-badge>
				{{ $locale.baseText('forms.resourceFiltersDropdown.filters') }}
			</n8n-button>
		</template>
		<div :class="$style['filters-dropdown']">
			<slot :filters="value" :setKeyValue="setKeyValue" />
			<enterprise-edition class="mb-s" :features="[EnterpriseEditionFeature.Sharing]">
				<n8n-input-label
					:label="$locale.baseText('forms.resourceFiltersDropdown.ownedBy')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<resource-sharing-filter-select
					:value="value.ownedBy"
					:related-id="value.sharedWith"
					@input="setKeyValue('ownedBy', $event)"
				/>
			</enterprise-edition>
			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
				<n8n-input-label
					:label="$locale.baseText('forms.resourceFiltersDropdown.sharedWith')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<resource-sharing-filter-select
					:value="value.sharedWith"
					:related-id="value.ownedBy"
					@input="setKeyValue('sharedWith', $event)"
				/>
			</enterprise-edition>
			<div :class="[$style['filters-dropdown-footer'], 'mt-s']" v-if="hasFilters">
				<n8n-link @click="resetFilters">
					{{ $locale.baseText('forms.resourceFiltersDropdown.reset') }}
				</n8n-link>
			</div>
		</div>
	</n8n-popover>
</template>

<script lang="ts">
import Vue from 'vue';
import {EnterpriseEditionFeature} from "@/constants";
import ResourceSharingFilterSelect from "@/components/forms/ResourceSharingFilterSelect.ee.vue";

export default Vue.extend({
	components: {
		ResourceSharingFilterSelect,
	},
	props: {
		value: {
			type: Object,
			default: () => ({}),
		},
		keys: {
			type: Array,
			default: (): string[] => [],
		},
		reset: {
			type: Function,
		},
	},
	data() {
		return {
			EnterpriseEditionFeature,
		};
	},
	computed: {
		filtersLength(): number {
			let length = 0;

			(this.keys as string[]).forEach((key) => {
				if (key === 'search') {
					return;
				}

				length += (Array.isArray(this.value[key]) ? this.value[key].length > 0 : this.value[key] !== '') ? 1 : 0;
			});

			return length;
		},
		hasFilters(): boolean {
			return this.filtersLength > 0;
		},
	},
	methods: {
		setKeyValue(key: string, value: unknown) {
			const filters = {
				...this.value,
				[key]: value,
			};

			this.$emit('input', filters);
		},
		resetFilters() {
			if (this.reset) {
				this.reset();
			} else {
				const filters = { ...this.value };

				(this.keys as string[]).forEach((key) => {
					filters[key] = Array.isArray(this.value[key]) ? [] : '';
				});

				this.$emit('input', filters);
			}
		},
	},
	watch: {
		filtersLength(value: number) {
			this.$emit('update:filtersLength', value);
		},
	},
});
</script>

<style lang="scss" module>
.filter-button {
	height: 36px;
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
