<script setup lang="ts">
import Modals from '@/app/components/Modals.vue';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';
</script>

<template>
	<div :id="APP_MODALS_ELEMENT_ID" :class="$style.modals">
		<Modals />
	</div>
</template>

<style lang="scss" module>
.modals {
	width: 100%;
}
</style>
