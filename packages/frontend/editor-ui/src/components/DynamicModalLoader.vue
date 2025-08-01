<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import * as modalRegistry from '@/moduleInitializer/modalRegistry';
import ModalRoot from '@/components/ModalRoot.vue';

// Keep track of registered modals
const registeredModals = ref<
	Array<{
		key: string;
		component: Component;
	}>
>([]);

// Type guard to check if component is an async component factory
const isAsyncComponentFactory = (
	component: Component | (() => Promise<Component>),
): component is () => Promise<Component> => {
	return typeof component === 'function';
};

const updateModals = () => {
	const modals: Array<{
		key: string;
		component: Component;
	}> = [];

	modalRegistry.getAll().forEach((modalDef, key) => {
		// Create async component wrapper if it's a function
		const component = isAsyncComponentFactory(modalDef.component)
			? defineAsyncComponent(modalDef.component)
			: modalDef.component;

		modals.push({ key, component });
	});

	registeredModals.value = modals;
};

// Subscribe to registry changes
let unsubscribe: (() => void) | undefined;

onMounted(() => {
	updateModals(); // Initial load
	unsubscribe = modalRegistry.subscribe(() => {
		updateModals();
	});
});

onUnmounted(() => {
	unsubscribe?.();
});
</script>

<template>
	<div>
		<template v-for="modal in registeredModals" :key="modal.key">
			<ModalRoot :name="modal.key">
				<template #default="{ modalName, active, open, activeId, mode, data }">
					<component
						:is="modal.component"
						:modal-name="modalName"
						:active="active"
						:open="open"
						:active-id="activeId"
						:mode="mode"
						:data="data"
					/>
				</template>
			</ModalRoot>
		</template>
	</div>
</template>
