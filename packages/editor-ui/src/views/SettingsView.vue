<template>
	<div :class="$style.container">
		<SettingsSidebar />
		<div :class="$style.contentContainer">
			<div :class="$style.content">
				<slot>
				</slot>
			</div>
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
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
}

.contentContainer {
	composes: container;
	justify-content: center;
	padding-top: 70.5px;
}

.content {
	min-width: 360px;
	max-width: 728px;
}
</style>
