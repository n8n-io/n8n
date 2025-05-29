<script setup lang="ts">
import type { FrontendSettings } from '@n8n/api-types';
import { computed } from 'vue';
import { useCssModule } from 'vue';

const props = defineProps<{
	location: 'authView' | 'sidebar';
	collapsed?: boolean;
	releaseChannel: FrontendSettings['releaseChannel'];
}>();

const { location } = props;

const $style = useCssModule();
const containerClasses = computed(() => {
	if (location === 'authView') {
		return [$style.logoContainer, $style.authView];
	}
	if (location === 'sidebar') {
		return [
			$style.logoContainer,
			$style.sidebar,
			props.collapsed ? $style.sidebarCollapsed : $style.sidebarExpanded,
		];
	}
	return [$style.logoContainer];
});
</script>

<template>
	<div :class="containerClasses" data-test-id="inmo-logo">
		<div :class="$style.logoGroup">
			<img src="/static/inmo-logo.png" :alt="'inmo logo'" :class="$style.secondLogo" />
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
@import '@/n8n-theme-variables.scss';

.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	padding: var(--spacing-xs) 0;
}

.logoGroup {
	display: flex;
	align-items: center;
	justify-content: center;
}

.secondLogo {
	height: 30px;
	width: auto;
}

.sidebarCollapsed {
	width: $sidebar-width !important;
	min-width: $sidebar-width !important;
	max-width: $sidebar-width !important;
	padding: 0;
	margin: 0;
	overflow: hidden;
}

.sidebarCollapsed .logoGroup {
	width: 100%;
	justify-content: center;
}

.sidebarCollapsed .secondLogo {
	display: block;
	margin: 0 auto;
	max-width: 48px;
}
</style>
