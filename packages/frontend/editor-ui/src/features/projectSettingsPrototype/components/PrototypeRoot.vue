<script setup lang="ts">
import { useProtoRouteSync } from '../nav/useProtoRouteSync';
import PrototypeChip from './PrototypeChip.vue';
import PrototypeParamsPanel from './PrototypeParamsPanel.vue';

/** Everything the prototype adds on top of the app: the chip and the parameters panel. */
useProtoRouteSync();
</script>

<template>
	<div :class="$style.root">
		<PrototypeChip />
		<PrototypeParamsPanel />
	</div>
</template>

<style module lang="scss">
/* Both children position themselves, so the wrapper must not take part in the app layout. */
.root {
	display: contents;
}
</style>
