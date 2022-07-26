<template>
	<page-view-layout>
		<template #aside>
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('credentials.heading') }}
			</n8n-heading>

			<n8n-button icon="plus-square">
				{{ $locale.baseText('credentials.add') }}
			</n8n-button>

			<n8n-menu type="secondary" @select="onSelect">
				<n8n-menu-item index="1">
					<template #title>Item 1</template>
				</n8n-menu-item>
				<n8n-menu-item index="2">
					<template #title>Item 2</template>
				</n8n-menu-item>
			</n8n-menu>
		</template>

		<div>
			<n8n-action-box
				emoji="👋"
				heading="Headline you need to know"
				description="Long description that you should know something is the way it is because of how it is. "
				buttonText="Do something"
				@click="addCredential"
			/>
		</div>
	</page-view-layout>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { IUser } from '@/Interface';
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
	},
	methods: {
		onSelect(index: string) {
			console.log(index);
		},
		addCredential() {
			console.log('add');
		},
	},
});
</script>

<style lang="scss" module>
</style>

