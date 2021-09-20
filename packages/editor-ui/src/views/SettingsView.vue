<template>
	<div :class="$style.container">
		<SettingsSidebar :selected="selected" />
		<div>
			<slot>
			</slot>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import SettingsSidebar from '../components/SettingsSidebar.vue';

export default Vue.extend({
	name: 'SettingsView',
	components: {
		SettingsSidebar,
	},
	props: {
		selected: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
}
</style>
