<script setup lang="ts">
import { computed, onMounted, useCssModule, useTemplateRef } from 'vue';
import { useFavicon } from '@vueuse/core';

import LogoIcon from './logo-icon.svg';
import LogoText from './logo-text.svg';

type ReleaseChannel = 'stable' | 'dev' | 'beta' | 'nightly';

const props = defineProps<
	(
		| {
				location: 'authView';
		  }
		| {
				location: 'sidebar';
		  }
	) & {
		releaseChannel: ReleaseChannel;
	}
>();

const { location, releaseChannel } = props;

const $style = useCssModule();
const containerClasses = computed(() => {
	if (location === 'authView') {
		return [$style.logoContainer, $style.authView];
	}
	return [$style.logoContainer, $style.sidebar];
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
		<LogoIcon ref="logo" :class="$style.logo" />
		<LogoText :class="$style.logoText" />
		<slot />
	</div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	align-items: center;
	height: 20px;
	margin-bottom: 5px;
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

	.logo,
	.logoText {
		transform: scale(1.3) translateY(-2px);
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
