<script setup lang="ts">
import type { FrontendSettings } from '@n8n/api-types';
import { computed, useCssModule } from 'vue';

import LogoCollapsed from './primary-logo-collapsed.png';
import LogoExpanded from './primary-logo-expanded.png';

const props = defineProps<
	(
		| {
				location: 'authView';
		  }
		| {
				location: 'sidebar';
				collapsed: boolean;
		  }
	) & {
		releaseChannel: FrontendSettings['releaseChannel'];
	}
>();

const { location } = props;

const showFullLogo = computed(() => {
	if (location === 'authView') return true;
	return !props.collapsed;
});

const logoSrc = computed(() => {
	return showFullLogo.value ? LogoExpanded : LogoCollapsed;
});

const $style = useCssModule();
const containerClasses = computed(() => {
	if (location === 'authView') {
		return [$style.logoContainer, $style.authView];
	}
	return [
		$style.logoContainer,
		$style.sidebar,
		props.collapsed ? $style.sidebarCollapsed : $style.sidebarExpanded,
	];
});
</script>

<template>
	<div :class="containerClasses" data-test-id="n8n-logo">
		<img :src="logoSrc" :class="$style.logo" alt="HubSync" />
		<slot />
	</div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
}

.logo {
	height: auto;
	max-width: 100%;
	object-fit: contain;
}

.authView {
	margin-bottom: var(--spacing-xl);

	.logo {
		height: 80px;
	}
}

.sidebarExpanded .logo {
	height: 32px;
	margin-left: var(--spacing-2xs);
}

.sidebarCollapsed .logo {
	height: 30px;
	width: 40px;
	padding: 0 var(--spacing-4xs);
	object-fit: contain;
}
</style>
