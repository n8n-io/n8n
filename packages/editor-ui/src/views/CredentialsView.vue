<template>
	<page-view-layout>
		<template #aside>
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('credentials.heading') }}
			</n8n-heading>

			<div class="mt-l mb-l">
				<n8n-button icon="plus-square" size="l" @click="addCredential">
					{{ $locale.baseText('credentials.add') }}
				</n8n-button>
			</div>

			<n8n-menu default-active="owner" type="secondary" @select="onSelect">
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

		<div v-if="credentials.length === 0">
			<n8n-action-box
				emoji="👋"
				:heading="$locale.baseText('credentials.empty.heading', { interpolate: { name: currentUser.firstName } })"
				:description="$locale.baseText('credentials.empty.description')"
				:buttonText="$locale.baseText('credentials.empty.button')"
				@click="addCredential"
			/>
		</div>
		<div v-else>
			<div class="mb-l">
				<n8n-input
					:placeholder="$locale.baseText('credentials.search.placeholder')"
					v-model="filter.search"
				>
					<n8n-icon icon="search" slot="prefix" />
				</n8n-input>
				<n8n-select
					v-model="filter.sortBy"
				>
					<n8n-option value="lastUpdated" :label="$locale.baseText('credentials.sort.lastUpdated')" />
					<n8n-option value="lastCreated" :label="$locale.baseText('credentials.sort.lastCreated')"/>
					<n8n-option value="nameAsc" :label="$locale.baseText('credentials.sort.nameAsc')"/>
					<n8n-option value="nameDesc" :label="$locale.baseText('credentials.sort.nameDesc')" />
				</n8n-select>
			</div>
			<ul class="list-style-none">
				<li v-for="credential in filteredAndSortedCredentials" :key="credential.id" class="mb-2xs">
					<credential-card :data="credential" />
				</li>
			</ul>
		</div>
	</page-view-layout>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import {ICredentialsResponse, IUser} from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import CredentialCard from "@/components/CredentialCard.vue";
import {CREDENTIAL_SELECT_MODAL_KEY} from "@/constants";

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		PageViewLayout,
		SettingsView,
		CredentialCard,
	},
	data() {
		return {
			loading: false,
			filter: {
				type: 'owner',
				search: '',
				sortBy: 'lastUpdated',
			},
		};
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		credentials(): ICredentialsResponse[] {
			return this.$store.getters['credentials/allCredentials'];
		},
		filteredAndSortedCredentials(): ICredentialsResponse[] {
			const filtered = this.credentials.filter((credential) => {
				let matches = true;

				if (this.filter.type === 'owner') {
					// matches = credential.owner.id === this.currentUser.id;
				}

				if (this.filter.search) {
					matches = matches && (credential.name.toLowerCase().includes(this.filter.search.toLowerCase()));
				}

				return matches;
			});

			return filtered.sort((a, b) => {
				switch (this.filter.sortBy) {
					// case 'lastUpdated':
					// 	return b.updatedAt - a.updatedAt;
					// case 'lastCreated':
					// 	return b.createdAt - a.createdAt;
					case 'nameAsc':
						return a.name.localeCompare(b.name);
					case 'nameDesc':
						return b.name.localeCompare(a.name);
					default:
						return 0;
				}
			});
		},
	},
	methods: {
		onSelect(type: string) {
			this.filter.type = type;
		},
		addCredential() {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);
		},
		loadCredentials () {
			this.$store.dispatch('credentials/fetchAllCredentials');
			this.$store.dispatch('credentials/fetchCredentialTypes');
			this.$store.dispatch('getNodeTypes');
		},
	},
	mounted() {
		this.loadCredentials();
	},
});
</script>

<style lang="scss" module>
</style>

