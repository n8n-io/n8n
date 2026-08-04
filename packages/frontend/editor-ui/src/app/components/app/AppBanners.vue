<script setup lang="ts">
import BannerStack from '@/features/shared/banners/components/BannerStack.vue';
import ImpersonationBar from '@/features/settings/serviceAccounts/components/ImpersonationBar.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';

const route = useRoute();

const isDemoMode = computed(() => route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF);
</script>

<template>
	<div id="banners" :class="$style.banners">
		<!--
			Sibling of, and above, BannerStack — never inside it. The stack renders only
			the single highest-priority banner and BaseBanner hard-wires a dismiss
			control, so a trial banner must not be able to hide the only exit from an
			impersonated session. AppBanners sits outside the router outlet and outside
			every per-layout BaseLayout, so this survives all navigation.
		-->
		<ImpersonationBar v-if="!isDemoMode" />
		<BannerStack v-if="!isDemoMode" />
	</div>
</template>

<style lang="scss" module>
.banners {
	z-index: var(--top-banners--z);
}
</style>
