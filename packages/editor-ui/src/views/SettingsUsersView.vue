<template>
	<SettingsView>
		<div :class="$style.header">
			<n8n-heading size="2xlarge">Users Settings</n8n-heading>
		</div>
		<div>
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

<style lang="scss" module>
.header {
	margin-bottom: var(--spacing-2xl);
}
</style>
