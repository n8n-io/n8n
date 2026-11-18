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

	/* Highlights a setting that the user opened from a link, e.g. from the command bar. */
	:global([data-settings-anchor-highlighted]) {
		animation: settings-anchor-highlight 2s ease-out;
	}
}

@keyframes settings-anchor-highlight {
	0%,
	40% {
		background-color: var(--background--active);
	}

	100% {
		background-color: transparent;
	}
}
</style>
