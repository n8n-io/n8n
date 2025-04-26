<script setup lang="ts">
import type { FrontendSettings } from '@n8n/api-types';
import { computed, onMounted, useCssModule, useTemplateRef } from 'vue';
import { useFavicon } from '@vueuse/core';

import LogoIcon from './logo-icon.svg';
import LogoText from './logo-text.svg';

const props = defineProps<{
	location: 'authView' | 'sidebar';
	collapsed?: boolean;
	releaseChannel: FrontendSettings['releaseChannel'];
}>();

const { location, releaseChannel } = props;

const showLogoText = computed(() => {
	if (location === 'authView') return true;
	if (location === 'sidebar') return !props.collapsed;
	return false;
});

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

const svg = useTemplateRef<{ $el: Element }>('logo');
onMounted(() => {
	if (releaseChannel === 'stable' || !('createObjectURL' in URL)) return;

	const logoEl = svg.value!.$el;

	// Change the logo fill color inline, so that favicon can also use it
	const logoColor = releaseChannel === 'dev' ? '#838383' : '#E9984B';
	logoEl.querySelector('path')?.setAttribute('fill', logoColor);

	// Reuse the SVG as favicon
	const blob = new Blob([logoEl.outerHTML], { type: 'image/svg+xml' });
	useFavicon(URL.createObjectURL(blob));
});
</script>

<template>
	<div :class="containerClasses" data-test-id="n8n-logo">
		<!-- 展开时显示两个logo -->
		<template v-if="location === 'sidebar' && !props.collapsed">
			<div :class="$style.logoGroup">
				<LogoIcon ref="logo" :class="$style.logo" />
				<LogoText v-if="showLogoText" :class="$style.logoText" />
			</div>
			<div :class="$style.logoGroup">
				<img src="/static/inmo-logo.png" :alt="'inmo logo'" :class="$style.secondLogo" />
			</div>
		</template>
		<!-- 收缩时只显示INMO -->
		<template v-else-if="location === 'sidebar'">
			<div :class="$style.logoGroup">
				<img src="/static/inmo-logo.png" :alt="'inmo logo'" :class="$style.secondLogo" />
			</div>
		</template>
		<template v-else>
			<div :class="$style.logoGroup">
				<LogoIcon ref="logo" :class="$style.logo" />
				<LogoText v-if="showLogoText" :class="$style.logoText" />
			</div>
		</template>
		<slot />
	</div>
</template>

<style lang="scss" module>
@import '@/n8n-theme-variables.scss';

.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-l);
	width: 100%;
}

.logoGroup {
	display: flex;
	align-items: center;
}

.logoText {
	margin-left: var(--spacing-5xs);
	path {
		fill: var(--color-text-dark);
	}
}

.authView {
	transform: scale(2);
	margin-bottom: var(--spacing-xl);
}

.logo,
.logoText {
	transform: scale(1.3) translateY(-2px);
}

.logoText {
	margin-left: var(--spacing-xs);
	margin-right: var(--spacing-3xs);
}

.sidebarExpanded .logo {
	margin-left: var(--spacing-2xs);
}

.sidebarCollapsed .logo {
	width: 40px;
	height: 30px;
	padding: 0 var(--spacing-4xs);
}

.secondLogo {
	height: 30px;
	width: auto;
}

.sidebarCollapsed .secondLogo {
	display: none;
}

.logoContainer.sidebarCollapsed {
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

.sidebarCollapsed .logo,
.sidebarCollapsed .logoText {
	display: none;
}
</style>
