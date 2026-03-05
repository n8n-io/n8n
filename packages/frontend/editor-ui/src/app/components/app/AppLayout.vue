<script lang="ts" setup>
import { defineAsyncComponent, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const DefaultLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/DefaultLayout.vue'),
);
const SettingsLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/SettingsLayout.vue'),
);
const WorkflowLayout = defineAsyncComponent(
	async () => await import('@/app/layouts/WorkflowLayout.vue'),
);
const AuthLayout = defineAsyncComponent(async () => await import('@/app/layouts/AuthLayout.vue'));
const DemoLayout = defineAsyncComponent(async () => await import('@/app/layouts/DemoLayout.vue'));
const ChatLayout = defineAsyncComponent(async () => await import('@/app/layouts/ChatLayout.vue'));

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
	<Suspense v-else>
		<SettingsLayout v-if="route.meta.layout === 'settings'" @mounted="onMounted" />
		<WorkflowLayout v-else-if="route.meta.layout === 'workflow'" @mounted="onMounted" />
		<AuthLayout v-else-if="route.meta.layout === 'auth'" @mounted="onMounted" />
		<DemoLayout v-else-if="route.meta.layout === 'demo'" @mounted="onMounted" />
		<ChatLayout v-else-if="route.meta.layout === 'chat'" @mounted="onMounted" />
		<DefaultLayout v-else @mounted="onMounted" />
	</Suspense>
</template>
