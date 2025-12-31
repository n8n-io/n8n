<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { computed, defineAsyncComponent } from 'vue';

const route = useRoute();

const emit = defineEmits<{
	mounted: [element: Element];
}>();

const DefaultLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/DefaultLayout.vue'),
);

const SettingsLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/SettingsLayout.vue'),
);

const WorkflowLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/WorkflowLayout.vue'),
);

const BlankLayout = defineAsyncComponent(async () => await import('@/app/layouts/BlankLayout.vue'));

const DemoLayout = defineAsyncComponent(async () => await import('@/app/layouts/DemoLayout.vue'));

const layout = computed(() => {
	const layouts = {
		default: DefaultLayout,
		settings: SettingsLayout,
		workflow: WorkflowLayout,
		blank: BlankLayout,
		demo: DemoLayout,
	};

	return layouts[route.meta.layout ?? 'default'] ?? layouts.default;
});

function onMounted(element: Element) {
	emit('mounted', element);
}
</script>
<template>
	<Suspense>
		<Component :is="layout" @mounted="onMounted" />
	</Suspense>
</template>
