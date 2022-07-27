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

		<div>
			<n8n-action-box
				v-if="credentials.length === 0"
				emoji="👋"
				:heading="$locale.baseText('credentials.empty.heading', { interpolate: { name: currentUser.firstName } })"
				:description="$locale.baseText('credentials.empty.description')"
				:buttonText="$locale.baseText('credentials.empty.button')"
				@click="addCredential"
			/>
			<ul class="list-style-none">
				<li v-for="credential in credentials" :key="credential.id" class="mb-2xs">
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
		filteredCredentials(): ICredentialsResponse[] {
			return this.credentials.filter((credential) => {
				if (this.filter.type === 'owner') {
					return credential.type === 'owner'; // @TODO
				}

				return true;
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

