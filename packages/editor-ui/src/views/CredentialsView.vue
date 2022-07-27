<template>
	<page-view-layout>
		<template #aside>
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('credentials.heading') }}
			</n8n-heading>

			<div class="mt-l mb-l">
				<n8n-button icon="plus-square" size="l">
					{{ $locale.baseText('credentials.add') }}
				</n8n-button>
			</div>

			<n8n-menu default-active="my" type="secondary" @select="onSelect">
				<n8n-menu-item index="my">
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
				emoji="👋"
				:heading="$locale.baseText('credentials.empty.heading', { interpolate: { name: currentUser.firstName } })"
				:description="$locale.baseText('credentials.empty.description')"
				:buttonText="$locale.baseText('credentials.empty.button')"
				@click="addCredential"
			/>
			{{ credentials }}
		</div>
	</page-view-layout>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import {ICredentialsResponse, IUser} from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		PageViewLayout,
		SettingsView,
	},
	data() {
		return {
			loading: false,
		};
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		credentials(): ICredentialsResponse[] {
			return this.$store.getters['credentials/allCredentials'];
		},
	},
	methods: {
		onSelect(index: string) {
		},
		addCredential() {
		},
		async loadCredentials (): Promise<void> {
			await this.$store.dispatch('credentials/fetchAllCredentials');
		},
	},
	mounted() {
		this.loadCredentials();
	},
});
</script>

<style lang="scss" module>
</style>

