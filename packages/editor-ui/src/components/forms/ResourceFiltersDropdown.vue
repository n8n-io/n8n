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
			<enterprise-edition class="mb-s" :features="[EnterpriseEditionFeature.Sharing]" v-if="shareable">
				<n8n-input-label
					:label="$locale.baseText('forms.resourceFiltersDropdown.ownedBy')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<n8n-user-select
					:users="ownedByUsers"
					:currentUserId="currentUser.id"
					:value="value.ownedBy"
					size="small"
					@input="setKeyValue('ownedBy', $event)"
				/>
			</enterprise-edition>
			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" v-if="shareable">
				<n8n-input-label
					:label="$locale.baseText('forms.resourceFiltersDropdown.sharedWith')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<n8n-user-select
					:users="sharedWithUsers"
					:currentUserId="currentUser.id"
					:value="value.sharedWith"
					size="small"
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
import Vue, { PropType } from 'vue';
import {EnterpriseEditionFeature} from "@/constants";
import {IResource} from "@/components/layouts/ResourcesListLayout.vue";
import {IUser} from "@/Interface";

export type IResourceFiltersType = Record<string, boolean | string | string[]>;

export default Vue.extend({
	props: {
		value: {
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
		},
	},
	data() {
		return {
			EnterpriseEditionFeature,
		};
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		allUsers(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
		ownedByUsers(): IUser[] {
			return this.allUsers.map((user) => user.id === this.value.sharedWith ? { ...user, disabled: true } : user);
		},
		sharedWithUsers(): IUser[] {
			return this.allUsers.map((user) => user.id === this.value.ownedBy ? { ...user, disabled: true } : user);
		},
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
