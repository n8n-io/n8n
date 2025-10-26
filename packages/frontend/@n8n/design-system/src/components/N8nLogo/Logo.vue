<script setup lang="ts">
import { useFavicon } from '@vueuse/core';
import { computed, onMounted, useCssModule, useTemplateRef } from 'vue';

import { getBrandOwner } from '@n8n/design-system/utils/brandOwner';

import CortexLogoIcon from './cortex-logo-icon.svg';
import CortexLogoText from './cortex-logo-text.svg';
import MOHLogoIcon from './moh-logo-icon.svg';
import MOHLogoText from './moh-logo-text.svg';

const props = defineProps<
	(
		| {
				size: 'large';
		  }
		| {
				size: 'small';
				collapsed: boolean;
		  }
	) & {
		releaseChannel: 'stable' | 'beta' | 'nightly' | 'dev';
	}
>();

const { size, releaseChannel } = props;

const showLogoText = computed(() => {
	if (size === 'large') return true;
	return !props.collapsed;
});

const getLogoText = () => {
	if (getBrandOwner() === 'MOH') {
		return MOHLogoText;
	}
	return CortexLogoText;
};

const getLogoIcon = () => {
	if (getBrandOwner() === 'MOH') {
		return MOHLogoIcon;
	}
	return CortexLogoIcon;
};

const $style = useCssModule();
const containerClasses = computed(() => {
	if (size === 'large') {
		return [$style.logoContainer, $style.large];
	}
	return [
		$style.logoContainer,
		$style.sidebar,
		props.collapsed ? $style.sidebarCollapsed : $style.sidebarExpanded,
	];
});

const svg = useTemplateRef<{ $el: Element }>('logo');
onMounted(() => {
	if (releaseChannel === 'stable' || !('createObjectURL' in URL)) return;

	const logoEl = svg.value!.$el;

	// Reuse the SVG as favicon
	const blob = new Blob([logoEl.outerHTML], { type: 'image/svg+xml' });
	useFavicon(URL.createObjectURL(blob));
});
</script>

<template>
	<div :class="containerClasses" data-test-id="n8n-logo">
		<component :is="getLogoIcon()" ref="logo" :class="$style.logo" />
		<component v-if="showLogoText" :is="getLogoText()" :class="$style.logoText" />
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
	margin-left: var(--spacing--5xs);
}

.large {
	transform: scale(2);
	margin-bottom: var(--spacing--xl);

	.logo,
	.logoText {
		transform: scale(1.3) translateY(-2px);
	}

	.logoText {
		margin-left: var(--spacing--lg);
		margin-right: var(--spacing--3xs);
	}
}

.sidebarExpanded .logo {
	margin-left: var(--spacing--2xs);
}

.sidebarCollapsed .logo {
	width: 40px;
	height: 30px;
	padding: 0 var(--spacing--4xs);
}
.dark .logoContainer .logoText text {
	fill: var(--color-text-light, #fff);
}
.dark .logoContainer .logo path {
	fill: var(--color-text-light, #fff);
}
</style>
