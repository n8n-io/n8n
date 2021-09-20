<template>
	<SettingsView selected="users">
		<div>
			Users Settings
		</div>
	</SettingsView>
</template>

<script lang="ts">
import Vue from 'vue';

import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsUsersView',
	components: {
		SettingsView,
	},
});
</script>

