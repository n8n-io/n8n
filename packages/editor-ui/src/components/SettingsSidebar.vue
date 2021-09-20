<template>
	<div :class="$style.container">
		<n8n-menu default-active="personal" :router="true">
			<n8n-menu-item index="personal" route="/settings/personal">
				<!-- <a href="/settings/personal"> -->
					<font-awesome-icon icon="user-astronaut" />
					<span slot="title">Personal</span>
				<!-- </a> -->
			</n8n-menu-item>
			<n8n-menu-item index="users" route="/settings/users">
				<!-- <a href="/settings/users"> -->
					<font-awesome-icon icon="users" />
					<span slot="title">Users</span>
				<!-- </a> -->
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

a {
	color: unset;
}
</style>
