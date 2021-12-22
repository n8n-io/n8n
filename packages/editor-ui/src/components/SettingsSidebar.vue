<template>
	<div :class="$style.container">
		<n8n-menu :router="true" :default-active="$route.path">
			<n8n-menu-item index="/workflow">
				<i :class="$style.icon">
					<font-awesome-icon icon="arrow-left" />
				</i>
				<n8n-heading slot="title" size="large" :bold="true">Settings</n8n-heading>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/personal" v-if="canAccessUsersView('PersonalSettings')">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-astronaut" />
				</i>
				<span slot="title">Personal</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/users" v-if="canAccessUsersView('UsersSettings')">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-friends" />
				</i>
				<span slot="title">Users</span>
			</n8n-menu-item>
		</n8n-menu>
		<div :class="$style.versionContainer">
			<n8n-link @click="onVersionClick" size="small">
				Version {{versionCli}}
			</n8n-link>
		</div>
	</div>
</template>

<script lang="ts">
import { ABOUT_MODAL_KEY } from '@/constants';
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'SettingsSidebar',
	computed: {
		...mapGetters('settings', ['versionCli']),
	},
	methods: {
		canAccessUsersView(viewName: string): boolean {
			const isAuthorized = this.$store.getters['users/canCurrentUserAccessView'];

			return isAuthorized(viewName);
		},
		onVersionClick() {
			this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	min-width: 200px;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	position: relative;
}

.icon {
	width: 24px;
	display: inline-flex;
	justify-content: center;
	margin-right: 10px;
}

.versionContainer {
	position: absolute;
	left: 20px;
	bottom: 20px;
}
</style>
