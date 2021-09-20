<template>
	<div :class="$style.container">
		<n8n-menu :router="true" :default-active="$route.path">
			<n8n-menu-item index="/workflow">
				<span :class="$style.icon">
					<font-awesome-icon icon="arrow-left" />
				</span>
				<n8n-text slot="title" type="heading" size="large" bold>Settings</n8n-text>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/personal">
				<span :class="$style.icon">
					<font-awesome-icon icon="user-astronaut" />
				</span>
				<span slot="title">Personal</span>
			</n8n-menu-item>
			<n8n-menu-item index="/settings/users">
				<span :class="$style.icon">
					<font-awesome-icon icon="users" />
				</span>
				<span slot="title">Users</span>
			</n8n-menu-item>
		</n8n-menu>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'SettingsSidebar',
	props: {
		selected: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.container {
	width: 200px;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
}

.icon {
	width: 24px;
	display: inline-flex;
	justify-content: center;
	margin-right: 10px;
}
</style>
