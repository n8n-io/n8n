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
	overflow: hidden;
}

.contentContainer {
	composes: container;
	justify-content: center;
	padding-top: 70.5px;
	height: 100%;
	overflow: auto;
	background-color: var(--color-background-light);
}

.content {
	height: 100%;
	width: 100%;
	max-width: 800px;
	padding: 0 var(--spacing-2xl);
}
</style>
