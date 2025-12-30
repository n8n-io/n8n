<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';

const route = useRoute();

const emit = defineEmits<{
	load: [element: Element | null];
}>();

const layoutRef = ref<Element | null>(null);

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

onMounted(() => {
	emit('load', layoutRef.value);
});
</script>
<template>
	<Suspense>
		<Component :is="layout" ref="layoutRef">
			<slot />
		</Component>
	</Suspense>
</template>
