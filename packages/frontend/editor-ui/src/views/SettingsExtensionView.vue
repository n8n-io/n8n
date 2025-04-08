<script setup lang="ts">
import { SETTINGS_EXTENSIONS_CONTAINER_ID } from '@/constants';
import { type Extension, useExtensionsStore } from '@/stores/extensions.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const extensionsStore = useExtensionsStore();

const containerId = ref(SETTINGS_EXTENSIONS_CONTAINER_ID);

const extension = computed<Extension | null>(() => {
	const extensionId = route.params.extensionId as string;
	return extensionsStore.extensions.find((extension) => extension.id === extensionId) ?? null;
});

watch(
	() => extension.value,
	async (newExtension, oldExtension) => {
		// TODO: Add better teardown logic
		const oldExtensionIFrame = document.querySelector(`[extensionID="${oldExtension?.id}"] iframe`);
		if (oldExtensionIFrame) {
			oldExtensionIFrame.remove();
		}
		if (newExtension) {
			await extensionsStore.setupExtension(newExtension.id);
		}
	},
);

onMounted(async () => {
	if (!extension.value) {
		return;
	}
	extensionsStore.setupMethod = 'isolatedEnv';

	await extensionsStore.setupExtension(extension.value.id);
});
</script>

<template>
	<div :id="containerId" :class="$style.container">
		<div v-if="extension" :class="$style.extensionContainer">
			<div :class="$style.header">
				<h1>{{ extension?.displayName }}</h1>
				<p>{{ extension?.description }}</p>
			</div>
		</div>
		<div v-else>
			<p>Extension "{{ route.params.extensionId }}" not found</p>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
	height: 100%;
}
</style>
