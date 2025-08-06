<script setup lang="ts">
import type { FrontendSettings } from '@n8n/api-types';
import { useFavicon } from '@vueuse/core';
import { computed, onMounted, useCssModule } from 'vue';

import logoIconUrl from './logo-icon.png';
import logoTextUrl from './logo-text.png';

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

const { location, releaseChannel } = props;

const showLogoText = computed(() => {
	// if (location === 'authView') return true;
	// return !props.collapsed;
	return props.collapsed;
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

onMounted(() => {
	if (releaseChannel === 'stable') return;

	// For PNG images, we can't dynamically change colors like we could with SVG
	// So we'll just use the PNG as favicon directly
	useFavicon(logoTextUrl as string);
});
</script>

<template>
  <div
    :class="containerClasses"
    data-test-id="n8n-logo"
  >
    

    <img
      v-if="showLogoText"
      :src="logoTextUrl"
      :class="$style.logoText"
      alt="Logo Text"
    />

		<img
			v-else
      ref="logo"
      :src="logoIconUrl"
      :class="$style.logo"
      alt="Logo"
    />
    <slot />
  </div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
}

.logoText {
	margin-left: var(--spacing-5xs);
	/* path {
		fill: var(--color-text-dark);
	} */
}

.authView {
	transform: scale(2);
	margin-bottom: var(--spacing-xl);

	.logo,
	.logoText {
		/* transform: scale(1.3) translateY(-2px);
		object-fit: 'contain'; */
		transform: scale(0.5) translateY(-2px);
		object-fit: contain;
	}

	.logoText {
		margin-left: var(--spacing-xs);
		margin-right: var(--spacing-3xs);
	}
}

.sidebarExpanded .logo {
	margin-left: var(--spacing-2xs);
}

.sidebarCollapsed .logo {
	width: 40px;
	height: 30px;
	padding: 0 var(--spacing-4xs);
}
</style>
