<script setup lang="ts">
import Modals from '@/app/components/Modals.vue';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { computed, useCssModule } from 'vue';

const uiStore = useUIStore();
const $style = useCssModule();

const classes = computed(() => {
	return {
		// [$style.visible]: uiStore.isAnyModalOpen,
	};
});
</script>

<template>
	<div :id="APP_MODALS_ELEMENT_ID">
		<Modals />
	</div>
</template>

<style module>
.visible {
	/*width: 100%;*/
	/*height: 100%;*/
	/*position: relative;*/
}
</style>
