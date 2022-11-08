<template>
	<div :class="$style.container">
		<SettingsSidebar @return="onReturn" />
		<div :class="$style.contentContainer">
			<div :class="$style.content">
				<!--
					Because we're using nested routes the props are going to be bind to the top level route
					so we need to pass them down to the child component
				-->
				<router-view name="settingsView" v-bind="$attrs" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Route } from 'vue-router';

import { VIEWS } from '@/constants';
import SettingsSidebar from '@/components/SettingsSidebar.vue';

const SettingsView = defineComponent({
	name: 'SettingsView',
	components: {
		SettingsSidebar,
	},
	beforeRouteEnter(to, from, next) {
		next(vm => {
			(vm as unknown as InstanceType<typeof SettingsView>).previousRoute = from;
		});
	},
	data() {
		return {
			previousRoute: null as Route | null,
		};
	},
	methods: {
		onReturn() {
			this.$router.push(this.previousRoute ? this.previousRoute.path : { name: VIEWS.HOMEPAGE });
		},
	},
});

export default SettingsView;
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
