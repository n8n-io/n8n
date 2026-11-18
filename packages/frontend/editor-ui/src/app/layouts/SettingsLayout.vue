<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import { VIEWS } from '@/app/constants';
import { isRouteLocationRaw } from '@/app/utils/typeGuards';
import { onMounted, ref, useTemplateRef } from 'vue';
import type { HistoryState } from 'vue-router';
import { useRouter } from 'vue-router';
import SettingsSidebar from '@/app/components/SettingsSidebar.vue';
import { useSettingsAnchorScroll } from '@/app/composables/useSettingsAnchorScroll';

const router = useRouter();

const previousRoute = ref<HistoryState[string] | undefined>();

useSettingsAnchorScroll(useTemplateRef('contentContainer'));

function onReturn() {
	const resolvedSettingsRoute = router.resolve({ name: VIEWS.SETTINGS });
	const resolvedPreviousRoute = isRouteLocationRaw(previousRoute.value)
		? router.resolve(previousRoute.value)
		: null;
	const backRoute =
		!resolvedPreviousRoute || resolvedPreviousRoute.path.startsWith(resolvedSettingsRoute.path)
			? { name: VIEWS.HOMEPAGE }
			: resolvedPreviousRoute;

	void router.push(backRoute);
}

onMounted(() => {
	previousRoute.value = router.options.history.state.back;
});
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<SettingsSidebar @return="onReturn" />
		</template>

		<div ref="contentContainer" :class="$style.contentContainer">
			<div :class="$style.content">
				<RouterView />
			</div>
		</div>
	</BaseLayout>
</template>

<style lang="scss" module>
.contentContainer {
	height: 100%;
	width: 100%;
	display: flex;
	overflow: hidden;
	justify-content: center;
	padding-top: 70.5px;
	overflow: auto;
	background-color: var(--color--background--light-2);
	position: relative;
}

.content {
	height: 100%;
	width: 100%;
	max-width: 1600px;
	padding: 0 var(--spacing--2xl);

	/*
	 * Highlights a setting that the user opened from a link, e.g. from the command bar.
	 * The timing follows Android Settings: 200 ms in and 200 ms out, ending on the third peak
	 * after 1 s. The tint then stays for 1.5 s and fades out over 500 ms.
	 */
	:global([data-settings-anchor-highlighted]) {
		--settings-anchor--color--background: color-mix(
			in srgb,
			var(--background--brand) 26%,
			transparent
		);

		animation: settings-anchor-highlight 3s var(--easing--ease-in-out);

		/* No flashes: the tint fades in once, stays, and fades out. */
		@media (prefers-reduced-motion: reduce) {
			animation-name: settings-anchor-highlight-steady;
		}
	}
}

/* Each step up or down takes 200 ms of the 3 s, i.e. 6.667%. */
@keyframes settings-anchor-highlight {
	0%,
	13.333%,
	26.667%,
	100% {
		background-color: transparent;
	}

	6.667%,
	20%,
	33.333%,
	83.333% {
		background-color: var(--settings-anchor--color--background);
	}
}

@keyframes settings-anchor-highlight-steady {
	0%,
	100% {
		background-color: transparent;
	}

	6.667%,
	83.333% {
		background-color: var(--settings-anchor--color--background);
	}
}
</style>
