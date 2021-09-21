<template>
	<div :class="$style.container">
		<n8n-menu :router="true" :default-active="$route.path">
			<n8n-menu-item index="/workflow">
				<i :class="$style.icon">
					<font-awesome-icon icon="arrow-left" />
				</i>
				<n8n-text slot="title" type="heading" size="large" bold>Settings</n8n-text>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/personal">
				<i :class="$style.icon">
					<font-awesome-icon icon="user-astronaut" />
				</i>
				<span slot="title">Personal</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/users">
				<i :class="$style.icon">
					<font-awesome-icon icon="users" />
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
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'SettingsSidebar',
	computed: {
		...mapGetters('settings', ['versionCli']),
	},
	methods: {
		onVersionClick() {
			this.$store.dispatch('ui/openAboutModal');
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
