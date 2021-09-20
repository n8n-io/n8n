<template>
	<SettingsView selected="personal">
		<div>
			Personal Settings
		</div>
	</SettingsView>
</template>

<script lang="ts">
import Vue from 'vue';

import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsPersonalView',
	components: {
		SettingsView,
	},
});
</script>

