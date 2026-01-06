<script lang="ts" setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import DefaultLayout from '@/app/layouts/DefaultLayout.vue';
import SettingsLayout from '@/app/layouts/SettingsLayout.vue';
import WorkflowLayout from '@/app/layouts/WorkflowLayout.vue';
import AuthLayout from '@/app/layouts/AuthLayout.vue';
import DemoLayout from '@/app/layouts/DemoLayout.vue';
import ChatLayout from '@/app/layouts/ChatLayout.vue';

const route = useRoute();
const router = useRouter();

const emit = defineEmits<{
	mounted: [element: Element];
}>();

const initialized = ref<boolean>(false);

const removeListener = router.afterEach(() => {
	initialized.value = true;
	removeListener();
});

function onMounted(element: Element) {
	emit('mounted', element);
}
</script>

<template>
	<div v-if="!initialized" />
	<SettingsLayout v-else-if="route.meta.layout === 'settings'" @mounted="onMounted" />
	<WorkflowLayout v-else-if="route.meta.layout === 'workflow'" @mounted="onMounted" />
	<AuthLayout v-else-if="route.meta.layout === 'auth'" @mounted="onMounted" />
	<DemoLayout v-else-if="route.meta.layout === 'demo'" @mounted="onMounted" />
	<ChatLayout v-else-if="route.meta.layout === 'chat'" @mounted="onMounted" />
	<DefaultLayout v-else @mounted="onMounted" />
</template>
