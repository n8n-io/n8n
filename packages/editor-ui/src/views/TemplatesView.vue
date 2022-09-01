<template>
	<div :class="$style.template">
		<div :class="isMenuCollapsed ? $style.menu : $style.expandedMenu"></div>
		<div :class="$style.container">
			<div :class="$style.header">
				<div :class="$style.goBack" v-if="goBackEnabled">
					<GoBackButton />
				</div>
				<slot name="header"></slot>
			</div>
			<div>
				<slot name="content"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import GoBackButton from '@/components/GoBackButton.vue';

export default Vue.extend({
	name: 'TemplatesView',
	components: {
		GoBackButton,
	},
	props: {
		goBackEnabled: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		isMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
});
</script>

<style lang="scss" module>
.mockMenu {
	height: 100%;
	min-height: 100vh;
}

.menu {
	composes: mockMenu;
	min-width: $--sidebar-width;
}

.expandedMenu {
	composes: mockMenu;
	min-width: $--sidebar-expanded-width;
}

.template {
	display: flex;
}

.container {
	width: 100%;
	max-width: 1024px;
	padding: var(--spacing-3xl) var(--spacing-3xl) var(--spacing-4xl) var(--spacing-3xl);
	margin: 0 auto;

	@media (max-width: $--breakpoint-md) {
		width: 900px;
	}
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing-2xl);
}

.goBack {
	margin-bottom: var(--spacing-2xs);
}
</style>
