<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import type { HistoryState } from 'vue-router';
import { useRouter } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import LayoutRouterView from '@/app/components/app/LayoutRouterView.vue';
import AppNavigation from '@/app/components/appNavigation/AppNavigation.vue';
// Prototype: the standard shell brings back master's settings sidebar and its way out.
import SettingsSidebar from '@/app/components/SettingsSidebar.vue';
import { VIEWS } from '@/app/constants';
import { isRouteLocationRaw } from '@/app/utils/typeGuards';
import { protoParams } from '@/features/projectSettingsPrototype/params';

const router = useRouter();

const previousRoute = ref<HistoryState[string] | undefined>();

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
	<!-- The navigation panel lists the settings pages, as it lists the pages of other rail items. -->
	<BaseLayout :inset="protoParams.shell !== 'standard'">
		<template #sidebar>
			<SettingsSidebar v-if="protoParams.shell === 'standard'" @return="onReturn" />
			<AppNavigation v-else />
		</template>

		<div
			:class="[$style.contentContainer, { [$style.standard]: protoParams.shell === 'standard' }]"
		>
			<div :class="$style.content">
				<LayoutRouterView />
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
	position: relative;
}

.standard {
	background-color: var(--color--background--light-2);
}

.content {
	height: 100%;
	width: 100%;
	max-width: 1600px;
	padding: 0 var(--spacing--2xl);
}
</style>
