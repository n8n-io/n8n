<template>
	<SettingsView selected="personal">
		<div :class="$style.header">
			<n8n-text type="heading" size="2xlarge">Personal Settings</n8n-text>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-text type="heading" size="large">Basic information</n8n-text>
			</div>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-text type="heading" size="large">Security</n8n-text>
			</div>
			<div>
				<n8n-input-label label="Password">
					<a><n8n-text size="medium">Change password</n8n-text></a>
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

