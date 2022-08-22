<template>
	<page-view-layout>
		<template #aside>
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('credentials.heading') }}
			</n8n-heading>

			<div class="mt-xl mb-l">
				<n8n-button icon="plus-square" size="large" @click="addCredential">
					{{ $locale.baseText('credentials.add') }}
				</n8n-button>
			</div>

			<n8n-menu default-active="owner" type="secondary" @select="onSelectOwner">
				<n8n-menu-item index="owner">
					<template #title>
						<n8n-icon icon="user" />
						<span class="ml-xs">
							{{ $locale.baseText('credentials.menu.myCredentials') }}
						</span>
					</template>
				</n8n-menu-item>
				<n8n-menu-item index="all">
					<template #title>
						<n8n-icon icon="globe-americas" />
						<span class="ml-xs">
							{{ $locale.baseText('credentials.menu.allCredentials') }}
						</span>
					</template>
				</n8n-menu-item>
			</n8n-menu>
		</template>

		<div v-if="loading">
			<n8n-loading :class="$style['header-loading']" variant="custom" />
			<n8n-loading :class="[$style['card-loading'], 'mt-l', 'mb-2xs']" variant="custom" />
			<n8n-loading :class="$style['card-loading']" variant="custom" />
		</div>
		<template v-else>
			<div v-if="credentials.length === 0">
				<n8n-action-box
					emoji="👋"
					:heading="$locale.baseText('credentials.empty.heading', { interpolate: { name: currentUser.firstName } })"
					:description="$locale.baseText('credentials.empty.description')"
					:buttonText="$locale.baseText('credentials.empty.button')"
					@click="addCredential"
				/>
			</div>
			<page-view-layout-list v-else>
				<template #header>
					<div class="mb-l">
						<div :class="$style['filters-row']">
							<n8n-input
								:class="[$style['search'], 'mr-s']"
								:placeholder="$locale.baseText('credentials.search.placeholder')"
								v-model="filters.search"
							>
								<n8n-icon icon="search" slot="prefix" />
							</n8n-input>
							<div :class="$style['sort-and-filter']">
								<n8n-select
									v-model="filters.sortBy"
								>
									<n8n-option value="lastUpdated" :label="$locale.baseText('credentials.sort.lastUpdated')" />
									<n8n-option value="lastCreated" :label="$locale.baseText('credentials.sort.lastCreated')" />
									<n8n-option value="nameAsc" :label="$locale.baseText('credentials.sort.nameAsc')" />
									<n8n-option value="nameDesc" :label="$locale.baseText('credentials.sort.nameDesc')" />
								</n8n-select>
								<el-dropdown trigger="click">
									<n8n-button
										icon="filter"
										type="tertiary"
										size="large"
										:class="[$style['filter-button'], 'ml-s']"
									>
										Filters
									</n8n-button>
									<el-dropdown-menu slot="dropdown" ref="filtersDropdown">
										<div :class="$style['filters-dropdown']">
											<div :class="$style['filters-dropdown-heading']">
												<n8n-heading size="medium">
													{{ $locale.baseText('credentials.filters.title') }}
												</n8n-heading>
												<n8n-button text @click="resetFilters" v-show="hasFilters">
													{{ $locale.baseText('credentials.filters.reset') }}
												</n8n-button>
											</div>
											<div class="mt-s mb-s">
												<n8n-input-label :label="$locale.baseText('credentials.filters.type')" />
												<n8n-select
													v-model="filtersInput.type"
													size="small"
													multiple
													filterable
												>
													<n8n-option
														v-for="credentialType in credentialTypes"
														:key="credentialType.name"
														:value="credentialType.name"
														:label="credentialType.displayName"
													/>
												</n8n-select>
											</div>
											<enterprise-edition class="mb-s" :features="[EnterpriseEditionFeature.CredentialsSharing]">
												<n8n-input-label :label="$locale.baseText('credentials.filters.ownedBy')" />
												<n8n-select
													v-model="filtersInput.ownedBy"
													size="small"
													filterable
												>
													<n8n-option
														v-for="user in users"
														:key="user.id"
														:value="user.id"
														:label="user.fullName"
													/>
												</n8n-select>
											</enterprise-edition>
											<enterprise-edition :features="[EnterpriseEditionFeature.CredentialsSharing]">
												<n8n-input-label :label="$locale.baseText('credentials.filters.sharedWith')" />
												<n8n-select
													v-model="filtersInput.sharedWith"
													size="small"
													filterable
												>
													<n8n-option
														v-for="user in users"
														:key="user.id"
														:value="user.id"
														:label="user.fullName"
													/>
												</n8n-select>
											</enterprise-edition>
											<div class="mt-s text-right">
												<n8n-button @click="applyFilters" type="secondary">
													{{ $locale.baseText('credentials.filters.apply') }}
												</n8n-button>
											</div>
										</div>
									</el-dropdown-menu>
								</el-dropdown>
							</div>
						</div>
						<div v-show="hasFilters" class="mt-2xs">
							<n8n-info-tip :bold="false">
								{{ $locale.baseText('credentials.filters.active') }}
								<n8n-link @click="resetFilters" size="small">
									{{ $locale.baseText('credentials.filters.active.reset') }}
								</n8n-link>
							</n8n-info-tip>
						</div>
					</div>
				</template>
				<ul class="list-style-none" v-if="filteredAndSortedCredentials.length > 0">
					<li v-for="credential in filteredAndSortedCredentials" :key="credential.id" class="mb-2xs">
						<credential-card :data="credential" />
					</li>
				</ul>
				<n8n-text color="text-base" size="medium" v-else>
					{{ $locale.baseText('credentials.noResults') }}
				</n8n-text>
			</page-view-layout-list>
		</template>
	</page-view-layout>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import {ICredentialsResponse, IUser} from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import PageViewLayoutList from "@/components/layouts/PageViewLayoutList.vue";
import CredentialCard from "@/components/CredentialCard.vue";
import {CREDENTIAL_SELECT_MODAL_KEY} from "@/constants";
import {ICredentialType} from "n8n-workflow";
import {EnterpriseEditionFeature} from "@/constants";

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		PageViewLayout,
		PageViewLayoutList,
		SettingsView,
		CredentialCard,
	},
	data() {
		return {
			loading: true,
			filters: {
				owner: true,
				sortBy: 'lastUpdated',
				search: '',
				type: [] as string[],
				ownedBy: '',
				sharedWith: '',
			},
			filtersInput: {
				type: [] as string[],
				ownedBy: '',
				sharedWith: '',
			},
			EnterpriseEditionFeature,
		};
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		users(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
		credentials(): ICredentialsResponse[] {
			return this.$store.getters['credentials/allCredentials'];
		},
		credentialTypes(): ICredentialType[] {
			return this.$store.getters['credentials/allCredentialTypes'];
		},
		filteredAndSortedCredentials(): ICredentialsResponse[] {
			const filtered = this.credentials.filter((credential) => {
				let matches = true;

				if (this.filters.owner) {
					matches = matches && credential.ownedBy && credential.ownedBy.id === this.currentUser.id;
				}

				if (this.filters.ownedBy) {
					matches = matches && credential.ownedBy && credential.ownedBy.id === this.filters.ownedBy;
				}

				if (this.filters.sharedWith) {
					matches = matches && credential.sharedWith && !!credential.sharedWith.find((sharee) => sharee.id === this.filters.sharedWith);
				}

				if (this.filters.type.length > 0) {
					matches = matches && this.filters.type.includes(credential.type);
				}

				if (this.filters.search) {
					matches = matches && (credential.name.toLowerCase().includes(this.filters.search.toLowerCase()));
				}

				return matches;
			});

			return filtered.sort((a, b) => {
				switch (this.filters.sortBy) {
					case 'lastUpdated':
						return (new Date(b.updatedAt)).valueOf() - (new Date(a.updatedAt)).valueOf();
					case 'lastCreated':
						return (new Date(b.createdAt)).valueOf() - (new Date(a.createdAt)).valueOf();
					case 'nameAsc':
						return a.name.localeCompare(b.name);
					case 'nameDesc':
						return b.name.localeCompare(a.name);
					default:
						return 0;
				}
			});
		},
		hasFilters(): boolean {
			return this.filters.search !== '' ||
				this.filters.type.length > 0 ||
				this.filters.ownedBy !== '' ||
				this.filters.sharedWith !== '';
		},
	},
	methods: {
		onSelectOwner(type: string) {
			this.filters.owner = type === 'owner';
		},
		addCredential() {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);
		},
		async initialize () {
			await Promise.all([
				this.$store.dispatch('credentials/fetchAllCredentials'),
				this.$store.dispatch('credentials/fetchCredentialTypes'),
				this.$store.dispatch('getNodeTypes'),
			]);

			this.loading = false;

			this.$store.dispatch('users/fetchUsers'); // Can be loaded in the background, used for filtering
		},
		applyFilters() {
			this.filters.type = this.filtersInput.type;
			this.filters.ownedBy = this.filtersInput.ownedBy;
			this.filters.sharedWith = this.filtersInput.sharedWith;

			if (this.$refs.filtersDropdown) {
				(this.$refs.filtersDropdown as Vue & { dropdown: { hide: () => void }}).dropdown.hide();
			}
		},
		resetFilters() {
			this.filters.search = '';
			this.filters.type = [];
			this.filters.ownedBy = '';
			this.filters.sharedWith = '';
			this.filters.sortBy = 'lastUpdated';
			this.filtersInput.type = [];
			this.filtersInput.ownedBy = '';
			this.filtersInput.sharedWith = '';
		},
	},
	mounted() {
		this.initialize();
	},
});
</script>

<style lang="scss" module>
.filters-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.search {
	max-width: 240px;
}

.sort-and-filter {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.filter-button {
	height: 40px;
}

.filters-dropdown {
	width: 280px;
	padding: var(--spacing-2xs) var(--spacing-s);
}

.filters-dropdown-heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header-loading {
	height: 42px;
}

.card-loading {
	height: 76px;
}
</style>

