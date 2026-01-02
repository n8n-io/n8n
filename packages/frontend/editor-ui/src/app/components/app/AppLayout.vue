<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';

import DefaultLayout from '@/app/layouts/DefaultLayout.vue';
import SettingsLayout from '@/app/layouts/SettingsLayout.vue';
import WorkflowLayout from '@/app/layouts/WorkflowLayout.vue';
import BlankLayout from '@/app/layouts/BlankLayout.vue';
import DemoLayout from '@/app/layouts/DemoLayout.vue';

const route = useRoute();

const emit = defineEmits<{
	mounted: [element: Element];
}>();

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
	<Component :is="layout" @mounted="onMounted" />
</template>
