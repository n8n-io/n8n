<script lang="ts" setup>
import { useRoute } from 'vue-router';

import DefaultLayout from '@/app/layouts/DefaultLayout.vue';
import SettingsLayout from '@/app/layouts/SettingsLayout.vue';
import WorkflowLayout from '@/app/layouts/WorkflowLayout.vue';
import AuthLayout from '@/app/layouts/AuthLayout.vue';
import DemoLayout from '@/app/layouts/DemoLayout.vue';

const route = useRoute();

const emit = defineEmits<{
	mounted: [element: Element];
}>();

function onMounted(element: Element) {
	emit('mounted', element);
}
</script>

<template>
	<SettingsLayout v-if="route.meta.layout === 'settings'" @mounted="onMounted" />
	<WorkflowLayout v-else-if="route.meta.layout === 'workflow'" @mounted="onMounted" />
	<AuthLayout v-else-if="route.meta.layout === 'auth'" @mounted="onMounted" />
	<DemoLayout v-else-if="route.meta.layout === 'demo'" @mounted="onMounted" />
	<DefaultLayout v-else @mounted="onMounted" />
</template>
