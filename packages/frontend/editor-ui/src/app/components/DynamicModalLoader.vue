<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';
import ModalRoot from '@/app/components/ModalRoot.vue';

// Type guard to check if component is an async component factory
const isAsyncComponentFactory = (
	component: Component | (() => Promise<Component>),
): component is () => Promise<Component> => {
	return typeof component === 'function';
};

// Derived straight from the registry, which is shallow-reactive — registering or
// unregistering a modal re-renders this list with no subscription to keep in sync.
// Neither the registry (shallow) nor a computed's value wraps what it holds, so
// components stay out of the reactive graph ("Vue received a Component that was
// made a reactive object...").
const registeredModals = computed(() =>
	Array.from(modalRegistry.getAll(), ([key, modalDef]) => ({
		key,
		component: isAsyncComponentFactory(modalDef.component)
			? defineAsyncComponent(modalDef.component)
			: modalDef.component,
	})),
);
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
