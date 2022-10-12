<template>
	<page-view-layout>
		<template #aside>
			<div :class="[$style['heading-wrapper'], 'mb-xs']">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('credentials.heading') }}
				</n8n-heading>
			</div>

			<div class="mt-xs mb-l">
				<n8n-button size="large" block @click="addCredential">
					{{ $locale.baseText('credentials.add') }}
				</n8n-button>
			</div>

			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
				<div :class="$style.sidebarContainer">
					<n8n-menu :items="menuItems" mode="tabs" @select="onSelectOwner" ref="selectOwnerMenu"></n8n-menu>
				</div>
			</enterprise-edition>
		</template>

		<div v-if="loading">
			<n8n-loading :class="[$style['header-loading'], 'mb-l']" variant="custom"/>
			<n8n-loading :class="[$style['card-loading'], 'mb-2xs']" variant="custom"/>
			<n8n-loading :class="$style['card-loading']" variant="custom"/>
		</div>
		<template v-else>
			<div class="ph-no-capture" v-if="allCredentials.length === 0">
				<n8n-action-box
					emoji="👋"
					:heading="$locale.baseText(currentUser.firstName ? 'credentials.empty.heading' : 'credentials.empty.heading.userNotSetup', {
						interpolate: { name: currentUser.firstName }
					})"
					:description="$locale.baseText('credentials.empty.description')"
					:buttonText="$locale.baseText('credentials.empty.button')"
					buttonType="secondary"
					@click="addCredential"
				/>
			</div>
			<page-view-layout-list v-else>
				<template #header>
					<div class="mb-xs">
						<div :class="$style['filters-row']">
							<n8n-input
								:class="[$style['search'], 'mr-2xs']"
								:placeholder="$locale.baseText('credentials.search.placeholder')"
								v-model="filters.search"
								size="medium"
								clearable
								ref="search"
							>
								<n8n-icon icon="search" slot="prefix"/>
							</n8n-input>
							<div :class="$style['sort-and-filter']">
								<n8n-select
									v-model="filters.sortBy"
									size="medium"
								>
									<n8n-option value="lastUpdated" :label="$locale.baseText('credentials.sort.lastUpdated')"/>
									<n8n-option value="lastCreated" :label="$locale.baseText('credentials.sort.lastCreated')"/>
									<n8n-option value="nameAsc" :label="$locale.baseText('credentials.sort.nameAsc')"/>
									<n8n-option value="nameDesc" :label="$locale.baseText('credentials.sort.nameDesc')"/>
								</n8n-select>
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
											{{ $locale.baseText('credentials.filters') }}
										</n8n-button>
									</template>
									<div :class="$style['filters-dropdown']">
										<div class="mb-s">
											<n8n-input-label
												:label="$locale.baseText('credentials.filters.type')"
												:bold="false"
												size="small"
												color="text-base"
												class="mb-3xs"
											/>
											<n8n-select
												v-model="filters.type"
												size="small"
												multiple
												filterable
												ref="typeInput"
												:class="$style['type-input']"
											>
												<n8n-option
													v-for="credentialType in allCredentialTypes"
													:key="credentialType.name"
													:value="credentialType.name"
													:label="credentialType.displayName"
												/>
											</n8n-select>
										</div>
										<enterprise-edition class="mb-s" :features="[EnterpriseEditionFeature.Sharing]">
											<n8n-input-label
												:label="$locale.baseText('credentials.filters.ownedBy')"
												:bold="false"
												size="small"
												color="text-base"
												class="mb-3xs"
											/>
											<n8n-select
												v-model="filters.ownedBy"
												class="ph-no-capture"
												:class="$style['user-select']"
												size="small"
												filterable
											>
												<template
													v-for="user in allUsers"
												>
													<n8n-option
														v-if="!user.isPending"
														:key="user.id"
														:value="user.id"
														:label="user.fullName"
														:disabled="user.id === filters.sharedWith"
													>
														<n8n-user-info
															v-bind="user"
															:class="$style['user-info']"
															:isCurrentUser="user.id === currentUser.id"
															:disabled="user.id === filters.sharedWith"
														/>
													</n8n-option>
												</template>
											</n8n-select>
										</enterprise-edition>
										<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
											<n8n-input-label
												:label="$locale.baseText('credentials.filters.sharedWith')"
												:bold="false"
												size="small"
												color="text-base"
												class="mb-3xs"
											/>
											<n8n-select
												v-model="filters.sharedWith"
												class="ph-no-capture"
												:class="$style['user-select']"
												size="small"
												filterable
											>
												<template v-for="user in allUsers">
													<n8n-option
														v-if="!user.isPending"
														:key="user.id"
														:value="user.id"
														:label="user.fullName"
														:disabled="user.id === filters.ownedBy"
													>
														<n8n-user-info
															v-bind="user"
															:class="$style['user-info']"
															:isCurrentUser="user.id === currentUser.id"
															:disabled="user.id === filters.ownedBy"
														/>
													</n8n-option>
												</template>
											</n8n-select>
										</enterprise-edition>
										<div :class="[$style['filters-dropdown-footer'], 'mt-s']" v-if="hasFilters">
											<n8n-link @click="resetFilters">
												{{ $locale.baseText('credentials.filters.reset') }}
											</n8n-link>
										</div>
									</div>
								</n8n-popover>
							</div>
						</div>
					</div>
				</template>

				<div v-show="hasFilters" class="mt-xs">
					<n8n-info-tip :bold="false">
						{{ $locale.baseText('credentials.filters.active') }}
						<n8n-link @click="resetFilters" size="small">
							{{ $locale.baseText('credentials.filters.active.reset') }}
						</n8n-link>
					</n8n-info-tip>
				</div>

				<div class="mt-xs mb-l">
					<ul class="list-style-none" v-if="filteredAndSortedSubviewCredentials.length > 0">
						<li v-for="credential in filteredAndSortedSubviewCredentials" :key="credential.id" class="mb-2xs">
							<credential-card :data="credential"/>
						</li>
					</ul>
					<n8n-text color="text-base" size="medium" v-else>
						{{ $locale.baseText('credentials.noResults') }}
						<template v-if="!hasFilters && filters.owner && credentialsNotOwned.length > 0">
							<span v-if="!filters.search">
								({{ $locale.baseText('credentials.noResults.switchToShared.preamble') }}
								<n8n-link @click="setOwnerFilter(false)">{{
										$locale.baseText('credentials.noResults.switchToShared.link')
									}}</n8n-link>)
							</span>
							<span v-else>
								({{ $locale.baseText('credentials.noResults.withSearch.switchToShared.preamble') }}
								<n8n-link @click="setOwnerFilter(false)">{{
										$locale.baseText('credentials.noResults.withSearch.switchToShared.link')
									}}</n8n-link>)
							</span>
						</template>
					</n8n-text>
				</div>
			</page-view-layout-list>
		</template>
	</page-view-layout>
</template>

<script lang="ts">
import {showMessage} from '@/components/mixins/showMessage';
import {ICredentialsResponse, IUser} from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import PageViewLayoutList from "@/components/layouts/PageViewLayoutList.vue";
import CredentialCard from "@/components/CredentialCard.vue";
import {CREDENTIAL_SELECT_MODAL_KEY} from "@/constants";
import {ICredentialType} from "n8n-workflow";
import {EnterpriseEditionFeature} from "@/constants";
import TemplateCard from "@/components/TemplateCard.vue";
import Vue from "vue";
import { debounceHelper } from '@/components/mixins/debounce';
import { IMenuItem } from 'n8n-design-system';

export default mixins(
	showMessage,
	debounceHelper,
).extend({
	name: 'SettingsPersonalView',
	components: {
		TemplateCard,
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
			resettingFilters: false,
			EnterpriseEditionFeature,
		};
	},
	computed: {
		menuItems(): IMenuItem[] {
			return [
				{
					id: 'owner',
					icon: 'user',
					label: this.$locale.baseText('credentials.menu.myCredentials'),
					position: 'top',
				},
				{
					id: 'all',
					icon: 'globe-americas',
					label: this.$locale.baseText('credentials.menu.allCredentials'),
					position: 'top',
				},
			];
		},
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		allUsers(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
		allCredentials(): ICredentialsResponse[] {
			return this.$store.getters['credentials/allCredentials'];
		},
		allCredentialTypes(): ICredentialType[] {
			return this.$store.getters['credentials/allCredentialTypes'];
		},
		credentialTypesById(): Record<ICredentialType['name'], ICredentialType> {
			return this.$store.getters['credentials/credentialTypesById'];
		},
		filtersLength(): number {
			let length = 0;

			if (this.filters.ownedBy) {
				length += 1;
			}
			if (this.filters.sharedWith) {
				length += 1;
			}
			if (this.filters.type.length > 0) {
				length += 1;
			}

			return length;
		},
		subviewCredentials(): ICredentialsResponse[] {
			return this.allCredentials.filter((credential: ICredentialsResponse) => {
				if (this.filters.owner && this.$store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.Sharing)) {
					return !!(credential.ownedBy && credential.ownedBy.id === this.currentUser.id);
				}

				return true;
			});
		},
		filteredAndSortedSubviewCredentials(): ICredentialsResponse[] {
			const filtered: ICredentialsResponse[] = this.subviewCredentials.filter((credential: ICredentialsResponse) => {
				let matches = true;

				if (this.filters.ownedBy) {
					matches = matches && !!(credential.ownedBy && credential.ownedBy.id === this.filters.ownedBy);
				}

				if (this.filters.sharedWith) {
					matches = matches && !!(credential.sharedWith && credential.sharedWith.find((sharee) => sharee.id === this.filters.sharedWith));
				}

				if (this.filters.type.length > 0) {
					matches = matches && this.filters.type.includes(credential.type);
				}

				if (this.filters.search) {
					const searchString = this.filters.search.toLowerCase();

					matches = matches && (
						credential.name.toLowerCase().includes(searchString) ||
						this.credentialTypesById[credential.type] && this.credentialTypesById[credential.type].displayName.toLowerCase().includes(searchString)
					);
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
		credentialsNotOwned(): ICredentialsResponse[] {
			return this.allCredentials.filter((credential: ICredentialsResponse) => {
				return credential.ownedBy && credential.ownedBy.id !== this.currentUser.id;
			});
		},
		hasFilters(): boolean {
			return this.filters.type.length > 0 ||
				this.filters.ownedBy !== '' ||
				this.filters.sharedWith !== '';
		},
	},
	methods: {
		addCredential() {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);
			this.resetFilters();

			this.$telemetry.track('User clicked add cred button', {
				source: 'Creds list',
			});
		},
		async initialize() {
			const loadPromises = [
				this.$store.dispatch('credentials/fetchAllCredentials'),
				this.$store.dispatch('credentials/fetchCredentialTypes'),
			];

			if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
				loadPromises.push(this.$store.dispatch('nodeTypes/getNodeTypes'));
			}

			await Promise.all(loadPromises);

			this.loading = false;
			this.$nextTick(this.focusSearchInput);

			this.$store.dispatch('users/fetchUsers'); // Can be loaded in the background, used for filtering
		},
		resetFilters() {
			this.filters.search = '';
			this.filters.type = [];
			this.filters.ownedBy = '';
			this.filters.sharedWith = '';
			this.filtersInput.type = [];
			this.filtersInput.ownedBy = '';
			this.filtersInput.sharedWith = '';

			this.resettingFilters = true;
			this.sendFiltersTelemetry('reset');
		},
		focusSearchInput() {
			if (this.$refs.search) {
				(this.$refs.search as Vue & { focus: () => void }).focus();
			}
		},
		setOwnerFilter(active: boolean) {
			(this.$refs.selectOwnerMenu as Vue & { $children: Array<{ activeIndex: string; }> }).$children[0].activeIndex = active ? 'owner' : 'all';
			this.filters.owner = active;
		},
		onSelectOwner(type: string) {
			this.filters.owner = type === 'owner';
		},
		sendSubviewTelemetry() {
			this.$telemetry.track('User changed credentials sub view', {
				sub_view: this.filters.owner ? 'My credentials' : 'All credentials',
			});
		},
		sendSortingTelemetry() {
			this.$telemetry.track('User changed sorting in cred list', {
				sub_view: this.filters.owner ? 'My credentials' : 'All credentials',
				sorting: this.filters.sortBy,
			});
		},
		sendFiltersTelemetry(source: string) {
			// Prevent sending multiple telemetry events when resetting filters
			// Timeout is required to wait for search debounce to be over
			if (this.resettingFilters) {
				if (source !== 'reset') {
					return;
				}

				setTimeout(() => this.resettingFilters = false, 1500);
			}

			const filters = this.filters as Record<string, string[] | string | boolean>;
			const filtersSet: string[] = [];
			const filterValues: Array<string[] | string | boolean | null> = [];

			['ownedBy', 'sharedWith', 'type', 'search'].forEach((key) => {
				if (filters[key]) {
					filtersSet.push(key);
					filterValues.push(key === 'search' ? null : filters[key]);
				}
			});

			this.$telemetry.track('User set filters in cred list', {
				filters_set: filtersSet,
				filter_values: filterValues,
				sub_view: this.filters.owner ? 'My credentials' : 'All credentials',
				creds_total_in_view: this.subviewCredentials.length,
				creds_after_filtering: this.filteredAndSortedSubviewCredentials.length,
			});
		},
	},
	mounted() {
		this.initialize();
	},
	watch: {
		'filters.owner'() {
			this.sendSubviewTelemetry();
		},
		'filters.ownedBy'(value) {
			if (value) {
				this.setOwnerFilter(false);
			}
			this.sendFiltersTelemetry('ownedBy');
		},
		'filters.sharedWith'() {
			this.sendFiltersTelemetry('sharedWith');
		},
		'filters.type'() {
			this.sendFiltersTelemetry('type');
		},
		'filters.search'() {
			this.callDebounced('sendFiltersTelemetry', { debounceTime: 1000, trailing: true }, 'search');
		},
		'filters.sortBy'() {
			this.sendSortingTelemetry();
		},
	},
});
</script>

<style lang="scss" module>
.heading-wrapper {
	padding-bottom: 1px; // Match input height
}

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

.header-loading {
	height: 36px;
}

.card-loading {
	height: 69px;
}

.user-select {
	--select-option-line-height: auto;
}

.user-info {
	margin: var(--spacing-2xs) 0;
}

.type-input {
	--max-width: 265px;
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>

