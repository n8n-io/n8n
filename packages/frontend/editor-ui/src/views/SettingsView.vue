<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import type { HistoryState } from 'vue-router';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import SettingsSidebar from '@/components/SettingsSidebar.vue';
import { isRouteLocationRaw } from '@/utils/typeGuards';

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
	<div :class="$style.container">
		<SettingsSidebar @return="onReturn" />
		<div :class="$style.contentContainer">
			<div :class="$style.content">
				<!--
					Because we're using nested routes the props are going to be bind to the top level route
					so we need to pass them down to the child component
				-->
				<RouterView name="settingsView" v-bind="$attrs" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	overflow: hidden;
}

.contentContainer {
	composes: container;
	justify-content: center;
	padding-top: 70.5px;
	height: 100%;
	overflow: auto;
	background-color: var(--color--background--light-2);
}

.content {
	height: 100%;
	width: 100%;
	max-width: 1440px;
	padding: 0 var(--spacing--2xl);
}
</style>
