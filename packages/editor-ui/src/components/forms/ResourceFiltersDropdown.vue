<template>
	<n8n-popover
		trigger="click"
	>
		<template #reference>
			<n8n-button
				icon="filter"
				type="tertiary"
				size="medium"
				:active="hasFilters"
				:class="[$style['filter-button'], 'ml-2xs']"
				data-test-id="resources-list-filters-trigger"
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
		<div
			:class="$style['filters-dropdown']"
			data-test-id="resources-list-filters-dropdown"
		>
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
					:currentUserId="usersStore.currentUser.id"
					:value="value.ownedBy"
					size="medium"
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
					:currentUserId="usersStore.currentUser.id"
					:value="value.sharedWith"
					size="medium"
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
import {IUser} from "@/Interface";
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';

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
		...mapStores(useUsersStore),
		ownedByUsers(): IUser[] {
			return this.usersStore.allUsers.map((user) => user.id === this.value.sharedWith ? { ...user, disabled: true } : user);
		},
		sharedWithUsers(): IUser[] {
			return this.usersStore.allUsers.map((user) => user.id === this.value.ownedBy ? { ...user, disabled: true } : user);
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
	padding-bottom: var(--spacing-s);
}

.filters-dropdown-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
