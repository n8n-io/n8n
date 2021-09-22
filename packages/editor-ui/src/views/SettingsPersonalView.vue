<template>
	<SettingsView>
		<div :class="$style.header">
			<n8n-heading size="2xlarge">Personal Settings</n8n-heading>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-heading size="large">Basic information</n8n-heading>
			</div>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-heading size="large">Security</n8n-heading>
			</div>
			<div>
				<n8n-input-label label="Password">
					<n8n-link>Change password</n8n-link>
				</n8n-input-label>
			</div>
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

<style lang="scss" module>
.header {
	margin-bottom: var(--spacing-2xl);
}

.sectionTitle {
	margin-bottom: var(--spacing-s);
}
</style>

